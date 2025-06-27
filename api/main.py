# First, set up the path
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Depends
from rag.RAG_2 import ArabicWikiRAG
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import everything else

app = FastAPI(title="Arabic Historical RAG API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

# Request Model


class QARequest(BaseModel):
    character_name: str
    question: str


# Initialize RAG system
rag_system = ArabicWikiRAG(
    gemini_api_key="AIzaSyBrjJ8gCp2E4sq0Klc3FQukg61SIVHoobY"
)


@app.post("/api/ask", summary="Ask historical character a question")
async def ask_question(request: QARequest):
    try:
        response = rag_system.ask_question(
            request.character_name,
            request.question
        )
        return {
            "success": True,
            "data": {
                "answer": response["answer"],
                "sources": response["sources"]
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Get the absolute path to the static directory
static_dir = os.path.join(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))), "static")

# Mount static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/", StaticFiles(directory=static_dir, html=True), name="root")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

