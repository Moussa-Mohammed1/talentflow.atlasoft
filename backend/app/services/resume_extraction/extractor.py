import os
import re
import fitz
import pdfplumber
from docx import Document

class UnsupportedFileTypeError(ValueError): 
    pass

class TextExtractionService:
    
    def extract(self, file_path: str) -> str:

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not Found{file_path}")
        
        file_extension = self._get_extension(file_path)

        if file_extension == "pdf":
            return self._extract_from_pdf(file_path)
        elif file_extension == "docx":
            return self._extract_from_docx(file_path)
        else:
            raise UnsupportedFileTypeError(f"File type unsupported: {file_extension}")
    
    def _extract_from_pdf(self, file_path: str) -> str:
        text = self._extract_pdf_pymupdf(file_path)
        
        if not text or len(text.strip()) < 50:
            text = self._extract_pdf_pdfplumber(file_path)

        return self._clean_text(text)
    
    def _extract_pdf_pdfplumber(self, file_path:str) -> str: 
        text = ""

        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")
        return text

    def _extract_pdf_pymupdf(self, file_path: str) -> str:
        text= ""
        try:
            doc = fitz.open(file_path)

            for page in doc:
                text += page.get_text()
            doc.close()
        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")
        return text
        

    def _extract_from_docx(self, file_path:str) -> str:

        try:
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
        except Exception as e:
            raise Exception(f"DOCX Extraction failed: {str(e)}")
        return self._clean_text(text)
    


    def _get_extension(self, file_path: str) -> str:
        return file_path.split(".")[-1].lower()

    def _clean_text(self, text:str) -> str:
        if not text:
            return ""

        cleaned = re.sub(r"\s+", " ", text)

        
        cleaned = "".join(ch for ch in cleaned if ch.isprintable())

        return text.strip()

        