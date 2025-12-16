import wikipedia
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import GoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationSummaryBufferMemory
from langchain.schema import Document
from langchain.memory.chat_message_histories import ChatMessageHistory
from langchain.schema.messages import messages_from_dict, messages_to_dict
import os
import json
from typing import Dict, List
import hashlib
from datetime import datetime

class ArabicWikiRAG:
    def __init__(self, gemini_api_key: str, user_id: str = "default_user"):
        wikipedia.set_lang("ar")
        self.user_id = user_id
        
        self.embeddings = HuggingFaceEmbeddings(
            model_name="silma-ai/silma-embeddding-matryoshka-0.1",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

        self.llm = GoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.3,
            google_api_key=gemini_api_key
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            separators=["\n", "\n\n", " "],
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        
        # Character-specific memories and chains
        self.memories = {}
        self.chains = {}
        
        # Create conversation_history directory if it doesn't exist
        os.makedirs("conversation_history", exist_ok=True)

    def _get_history_path(self, character_name: str) -> str:
        """Get the path to save the conversation history."""
        return f"conversation_history/{self.user_id}_{character_name}.json"

    def _save_conversation(self, character_name: str) -> None:
        """Save conversation to a JSON file."""
        if character_name in self.memories and hasattr(self.memories[character_name], "chat_memory"):
            file_path = self._get_history_path(character_name)
            
            # Convert messages to dict format
            messages_dict = messages_to_dict(self.memories[character_name].chat_memory.messages)
            
            # Save with proper encoding for Arabic text
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(messages_dict, f, ensure_ascii=False, indent=2)
                
    def _load_conversation(self, character_name: str) -> ChatMessageHistory:
        """Load conversation from a JSON file if it exists."""
        file_path = self._get_history_path(character_name)
        history = ChatMessageHistory()
        
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    saved_messages = json.load(f)
                
                # Convert dict to messages and assign directly
                history.messages = messages_from_dict(saved_messages)
                
            except json.JSONDecodeError:
                print(f"Warning: Could not load conversation history from {file_path}")
        
        return history

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
            
            # Create documents with metadata
            documents = [
                Document(
                    page_content=t,
                    metadata={"source": f"Wikipedia: {character_name}", "chunk": i}
                ) for i, t in enumerate(texts)
            ]
            
            vector_store = FAISS.from_documents(documents, self.embeddings)
            vector_store.save_local(index_path)
        
        return index_path

    def _fetch_wikipedia_content(self, character_name: str) -> str:
        try:
            search_results = wikipedia.search(character_name)
            return wikipedia.page(search_results[0]).content
        except Exception as e:
            raise ValueError(f"Wikipedia error: {str(e)}")
            
    def fetch_wikipedia_content(self, character_name: str) -> str:
        return self._fetch_wikipedia_content(character_name)
        
    def process_and_store_content(self, content: str, character_name: str) -> None:
        index_path = self._get_index_path(character_name)
        texts = self.text_splitter.split_text(content)
        
        # Create documents with metadata
        documents = [
            Document(
                page_content=t,
                metadata={"source": f"Wikipedia: {character_name}", "chunk": i}
            ) for i, t in enumerate(texts)
        ]
        
        vector_store = FAISS.from_documents(documents, self.embeddings)
        vector_store.save_local(index_path)

    def _get_or_create_memory(self, character_name: str):
        """Get or create memory for a character"""
        if character_name not in self.memories:
            # Load existing chat history if available
            chat_history = self._load_conversation(character_name)
            
            # Create memory with the loaded chat history
            self.memories[character_name] = ConversationSummaryBufferMemory(
                llm=self.llm,
                chat_memory=chat_history,
                max_token_limit=1000,
                memory_key="chat_history",
                return_messages=True,
                output_key="answer"
            )
            
        return self.memories[character_name]

    def reset_conversation(self, character_name: str):
        """Reset the conversation memory for a specific character"""
        if character_name in self.memories:
            # Create a new empty history
            self.memories[character_name].chat_memory = ChatMessageHistory()
            
            # Save the empty history
            self._save_conversation(character_name)
            
            # Delete the chain to recreate it
            if character_name in self.chains:
                del self.chains[character_name]
                
            print(f"تم إعادة تعيين المحادثة مع {character_name}.")

    def ask_question(self, character_name: str, question: str) -> Dict:
        """Main endpoint for question answering with conversation memory"""
        index_path = self._process_character(character_name)
        vector_store = FAISS.load_local(index_path, self.embeddings, allow_dangerous_deserialization=True)
        
        memory = self._get_or_create_memory(character_name)

        prompt_template = """استخدم المعلومات التالية للإجابة على السؤال.
        إذا لم تكن تعرف الإجابة، فقط قل أنك لا تعرف، لا تحاول اختلاق إجابة. أجب كما لو كانت انت الشخصية التاريخية و لا تحيد عن لعب هذا الدور ابدا

        كن مختصرا قدر الامكان

        المحادثة السابقة:
        {chat_history}

        المعلومات: {context}

        السؤال الحالي: {question}

        الإجابة:"""
        
        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "chat_history", "question"]
        )

        # Create or retrieve the chain for this character
        if character_name not in self.chains:
            self.chains[character_name] = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=vector_store.as_retriever(search_kwargs={"k": 2}),
                memory=memory,
                return_source_documents=True,
                combine_docs_chain_kwargs={"prompt": PROMPT},
                output_key="answer"
            )

        # Use invoke method
        result = self.chains[character_name].invoke({"question": question})
        
        # Save conversation after getting response
        self._save_conversation(character_name)
        
        return {
            "answer": result["answer"],
            "sources": [doc.metadata.get('source', 'Unknown source') for doc in result["source_documents"]]
        }
    
    def get_conversation_history(self, character_name: str) -> List[Dict]:
        """Get the full conversation history with a character"""
        if character_name in self.memories:
            return messages_to_dict(self.memories[character_name].chat_memory.messages)
        return []
    
def main():
    GEMINI_API_KEY = "gemini_api_key" 
    
    # Create the RAG system with a user ID
    user_id = "test_user_123"
    rag_system = ArabicWikiRAG(GEMINI_API_KEY, user_id)
    
    character_name = "صلاح الدين الأيوبي" 
    
    print(f"اختبار نظام المحادثة المستمر مع {character_name}:")
    print("=" * 50)
    
    # First question
    question1 = "ما هي أهم إنجازاتك؟"
    print(f"\nالسؤال الأول: {question1}")
    result1 = rag_system.ask_question(character_name, question1)
    print(f"الإجابة: {result1['answer']}")
    
    # Second question - demonstrates follow-up capability
    question2 = "كيف حققت هذه الإنجازات؟"
    print(f"\nالسؤال الثاني: {question2}")
    result2 = rag_system.ask_question(character_name, question2)
    print(f"الإجابة: {result2['answer']}")
    
    # Third question
    question3 = "ما هي أهم المعارك التي خضتها؟"
    print(f"\nالسؤال الثالث: {question3}")
    result3 = rag_system.ask_question(character_name, question3)
    print(f"الإجابة: {result3['answer']}")
    
    print("\n" + "=" * 50)
    print("المحادثة محفوظة في ملف JSON. يمكنك إغلاق البرنامج وإعادة تشغيله وستبقى المحادثة.")
    
    # Display the saved conversation
    history = rag_system.get_conversation_history(character_name)
    print("\nتاريخ المحادثة المحفوظ:")
    for msg in history:
        role = "أنت" if msg["type"] == "human" else character_name
        print(f"{role}: {msg['data']['content']}")
    
    # Show the path to the saved file
    file_path = f"conversation_history/{user_id}_{character_name}.json"
    print(f"\nتم حفظ المحادثة في الملف: {file_path}")

if __name__ == "__main__":
    main()
