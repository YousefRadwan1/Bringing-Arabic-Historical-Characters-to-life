import wikipedia
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import GoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
import os
from typing import Dict, List
import hashlib

existing_characters = ['صلاح الدين الأيوبي', 'محمد علي باشا']


class ArabicWikiRAG:
    def __init__(self, gemini_api_key: str):
        wikipedia.set_lang("ar")

        self.embeddings = HuggingFaceEmbeddings(
            model_name="silma-ai/silma-embeddding-matryoshka-0.1",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

        self.llm = GoogleGenerativeAI(
            model="gemini-2.5-flash-preview-05-20",
            temperature=0.3,
            google_api_key=gemini_api_key
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            separators=["\n", "\n\n", " "],
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )

    def _get_index_path(self, character_name: str) -> str:
        """Generate unique index path for each character"""
        name_hash = hashlib.sha256(character_name.encode()).hexdigest()[:16]
        return f"faiss_indices/{name_hash}"

    def _process_character(self, character_name: str) -> str:
        """Process and store character data if not exists"""
        index_path = self._get_index_path(character_name)

        if not os.path.exists(index_path):
            content = self._fetch_wikipedia_content(character_name)
            if not content:
                raise ValueError(f"No content found for {character_name}")

            texts = self.text_splitter.split_text(content)
            vector_store = FAISS.from_texts(texts, self.embeddings)
            vector_store.save_local(index_path)

        return index_path

    def _fetch_wikipedia_content(self, character_name: str) -> str:
        try:
            search_results = wikipedia.search(character_name)
            return wikipedia.page(search_results[0]).content
        except Exception as e:
            raise ValueError(f"Wikipedia error: {str(e)}")

    def ask_question(self, character_name: str, question: str) -> Dict:
        """Main endpoint for question answering"""
        index_path = self._process_character(character_name)
        vector_store = FAISS.load_local(
            index_path, self.embeddings, allow_dangerous_deserialization=True)

        prompt_template = """استخدم المعلومات التالية للإجابة على السؤال.
        إذا لم تكن تعرف الإجابة، فقط قل أنك لا تعرف، لا تحاول اختلاق إجابة. أجب كما لو كانت انت الشخصية التاريخية و لا تحيد عن لعب هذا الدور ابدا

    

        المعلومات: {context}

        السؤال: {question}

        الإجابة:"""

        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )

        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": 1}),
            return_source_documents=True,
            chain_type_kwargs={"prompt": PROMPT}
        )

        result = qa_chain({"query": question})

        return {
            "answer": result["result"],
            "sources": [doc.metadata.get('source') for doc in result["source_documents"]]
        }


def main():
    GEMINI_API_KEY = "AIzaSyBrjJ8gCp2E4sq0Klc3FQukg61SIVHoobY"

    rag_system = ArabicWikiRAG(GEMINI_API_KEY)

    character_name = "صلاح الدين الأيوبي"

    if character_name not in existing_characters:
        content = rag_system.fetch_wikipedia_content(character_name)
        rag_system.process_and_store_content(content)

    question = "ما هي أهم إنجازات صلاح الدين؟"
    result = rag_system.ask_question(character_name, question)
    print(f"السؤال: {question}")
    print(f"الإجابة: {result['answer']}")
    print(f"المعلومات: {result['sources']}")


if __name__ == "__main__":
    main()
