from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from PIL import Image
from datetime import datetime
from .result import ResultCreate, ResultResponse
import logging
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()

def get_database():
    from main import app
    return app.state.database

class BatchPDFRequest(BaseModel):
    examId: str
    examName: str
    results: List[dict]

@router.post("/save")
async def save_result(result: ResultCreate, db=Depends(get_database)):
    try:
        logger.info(f"Received result for saving: {result.dict()}")
        result_data = result.dict()
        result_data["processedAt"] = datetime.utcnow()

        existing_result = await db.results.find_one({
            "examId": result.examId,
            "studentId": result.studentId
        })

        if existing_result:
            await db.results.update_one(
                {"examId": result.examId, "studentId": result.studentId},
                {"$set": result_data}
            )
            logger.info(f"Updated existing result for student {result.studentId}")
        else:
            await db.results.insert_one(result_data)
            logger.info(f"Inserted new result for student {result.studentId}")

        return {"message": "Result saved successfully"}
    except ValueError as ve:
        logger.error(f"Validation error saving result: {str(ve)}")
        raise HTTPException(status_code=422, detail=f"Invalid input data: {str(ve)}")
    except Exception as e:
        logger.error(f"Failed to save result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save result: {str(e)}")

@router.post("/publish")
async def publish_results(publish_data: dict, db=Depends(get_database)):
    try:
        logger.info(f"Received publish request: {json.dumps(publish_data, default=str)}")
        exam_id = publish_data.get("examId")
        exam_name = publish_data.get("examName")
        results = publish_data.get("results", [])
        
        logger.info(f"Publishing {len(results)} results for exam {exam_id}")

        if not exam_id or not results:
            logger.error("Missing examId or results in publish request")
            raise HTTPException(status_code=400, detail="examId and results are required")

        exam = await db.exams.find_one({"examId": exam_id})
        if not exam:
            logger.error(f"Exam {exam_id} not found")
            raise HTTPException(status_code=404, detail="Exam not found")

        for result in results:
            result_data = {
                "examId": exam_id,
                "examName": exam_name,
                "studentId": result.get("studentId"),
                "studentName": result.get("studentName"),
                "rank": result.get("rank"),
                "lockerNumber": result.get("lockerNumber"),
                "score": result.get("score"),
                "totalMarks": result.get("totalMarks"),
                "percentage": result.get("percentage"),
                "passFailStatus": result.get("passFailStatus"),
                "correctAnswers": result.get("correctAnswers"),
                "incorrectAnswers": result.get("incorrectAnswers"),
                "blankAnswers": result.get("blankAnswers"),
                "multipleMarks": result.get("multipleMarks"),
                "responses": result.get("responses"),
                "sponsorDS": result.get("sponsorDS"),
                "course": result.get("course"),
                "wing": result.get("wing"),
                "module": result.get("module"),
                "publishedAt": datetime.utcnow()
            }

            existing_result = await db.results.find_one({
                "examId": exam_id,
                "studentId": result.get("studentId")
            })

            if existing_result:
                await db.results.update_one(
                    {"examId": exam_id, "studentId": result.get("studentId")},
                    {"$set": result_data}
                )
                logger.info(f"Updated published result for student {result.get('studentId')}")
            else:
                await db.results.insert_one(result_data)
                logger.info(f"Inserted published result for student {result.get('studentId')}")

        return {"message": f"Successfully published {len(results)} results for exam {exam_id}"}
    except Exception as e:
        logger.error(f"Failed to publish results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to publish results: {str(e)}")

@router.get("/all", response_model=List[dict])
async def get_all_results(db=Depends(get_database)):
    try:
        logger.info("Fetching all results")
        cursor = db.results.find().sort("processedAt", -1)
        results = await cursor.to_list(length=None)
        
        for result in results:
            result['_id'] = str(result['_id'])
        
        logger.info(f"Retrieved {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"Failed to fetch results: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch results")

@router.post("/download-batch-pdf")
async def download_batch_pdf(request_data: BatchPDFRequest, images: List[UploadFile] = File(...)):
    try:
        logger.info(f"Received batch PDF request: {request_data.dict()}")
        logger.info(f"Received {len(images)} images")
        exam_id = request_data.examId
        exam_name = request_data.examName
        results = request_data.results
        
        logger.info(f"Generating batch PDF for exam {exam_id} with {len(results)} results")

        if not exam_id or not exam_name or not results:
            logger.error("Missing examId, examName, or results in request")
            raise HTTPException(status_code=400, detail="examId, examName, and results are required")

        if len(images) != len(results):
            logger.error(f"Number of images ({len(images)}) does not match number of results ({len(results)})")
            raise HTTPException(status_code=400, detail=f"Number of images: {len(images)} must match number of results ({len(results)})")
        
        required_fields = ["studentId", "studentName", "score", "totalMarks", "passFailStatus"]
        for result in results:
            missing_fields = [field for field in required_fields if field not in result or result[field] is None]
            if missing_fields:
                logger.error(f"Result missing required fields: {missing_fields}")
                raise HTTPException(status_code=400, detail=f"Result missing required fields: {missing_fields}")
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        margin = 50
        line_height = 20
        
        # Title page
        p.setFont("Helvetica-Bold", 18)
        y_pos = height - margin
        p.drawCentredString(width/2, y_pos, "OMR Checked Answer Sheets")
        p.setFont("Helvetica", 12)
        y_pos -= line_height
        p.drawCentredString(width/2, y_pos, f"Exam: {exam_name}")
        y_pos -= line_height
        p.drawCentredString(width/2, y_pos, f"Generated: {datetime.now().strftime('%Y-%m-%d')}")
        p.showPage()
        
        # Process each image and result
        for i, (image, result) in enumerate(zip(images, results)):
            if i > 0:
                p.showPage()
            
            # Reset position for new page
            y_pos = height - margin
            
            # Header
            p.setFont("Helvetica-Bold", 16)
            p.drawString(margin, y_pos, f"Answer Sheet - {result['studentName']}")
            y_pos -= line_height
            
            p.setFont("Helvetica", 12)
            p.drawString(margin, y_pos, f"Student ID: {result['studentId']}")
            y_pos -= line_height
            p.drawString(margin, y_pos, f"Rank: {result.get('rank', 'N/A')}")
            y_pos -= line_height
            p.drawString(margin, y_pos, f"Locker: {result.get('lockerNumber', 'N/A')}")
            y_pos -= line_height * 2
            
            # Read image data
            image_data = await image.read()
            img = Image.open(io.BytesIO(image_data))
            
            # Resize image to fit page while maintaining aspect ratio
            img_width, img_height = img.size
            aspect = img_height / float(img_width)
            target_width = width - (2 * margin)
            target_height = target_width * aspect
            
            if target_height > height - (y_pos + margin + 100):
                target_height = height - (y_pos + margin + 100)
                target_width = target_height / aspect
            
            # Draw image
            p.drawImage(ImageReader(io.BytesIO(image_data)), margin, margin + 50, target_width, target_height)
            y_pos = margin + 50 - line_height
            
            # Footer with result
            p.setFont("Helvetica-Bold", 12)
            p.setFillColorRGB(1, 0, 0)  # Red color
            result_text = f"Result: {result['score']}/{result['totalMarks']} - {result['passFailStatus']}"
            p.drawCentredString(width/2, margin, result_text)
            p.setFillColorRGB(0, 0, 0)  # Reset to black
        
        p.save()
        buffer.seek(0)
        
        logger.info(f"Generated batch PDF for exam {exam_id}")
        return StreamingResponse(
            io.BytesIO(buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={exam_name}_Checked_Sheets.pdf"}
        )
    
    except Exception as e:
        logger.error(f"Failed to generate PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.post("/download-all-pdf")
async def download_all_pdf(request_data: dict):
    try:
        logger.info(f"Received summary PDF request: {json.dumps(request_data, default=str)}")
        results = request_data.get("results", [])
        filters = request_data.get("filters", {})
        
        logger.info(f"Generating summary PDF with {len(results)} results")

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        margin = 50
        line_height = 18
        y_pos = height - margin

        # Title
        p.setFont("Helvetica-Bold", 18)
        p.drawCentredString(width/2, y_pos, "OMR Results Report")
        y_pos -= line_height * 1.5
        p.setFont("Helvetica", 12)
        p.drawCentredString(width/2, y_pos, f"Generated: {datetime.now().strftime('%Y-%m-%d')}")
        y_pos -= line_height * 2

        # Summary Statistics
        total_students = len(results)
        passed_students = len([r for r in results if r.get('passFailStatus') == 'Pass'])
        failed_students = total_students - passed_students
        avg_percentage = sum(r.get('percentage', 0) for r in results) / total_students if total_students > 0 else 0

        p.setFont("Helvetica-Bold", 14)
        p.drawString(margin, y_pos, "Summary Statistics")
        y_pos -= line_height * 1.5
        p.setFont("Helvetica", 11)
        
        # Draw each statistic on a new line with increased spacing
        p.drawString(margin, y_pos, f"Total Students: {total_students}")
        y_pos -= line_height
        p.drawString(margin, y_pos, f"Passed: {passed_students} ({(passed_students/total_students*100):.1f}%)")
        y_pos -= line_height
        p.drawString(margin, y_pos, f"Failed: {failed_students} ({(failed_students/total_students*100):.1f}%)")
        y_pos -= line_height
        p.drawString(margin, y_pos, f"Average Score: {avg_percentage:.1f}%")
        y_pos -= line_height * 2

        # Results Table Header
        p.setFont("Helvetica-Bold", 9)
        headers = ["Student Name", "ID", "Exam", "Score", "%", "Result"]
        # Adjusted x-positions to prevent overlap
        x_positions = [margin, margin + 120, margin + 200, margin + 280, margin + 340, margin + 380]
        for header, x_pos in zip(headers, x_positions):
            p.drawString(x_pos, y_pos, header)
        y_pos -= line_height * 0.8
        p.line(margin, y_pos, width - margin, y_pos)  # Header underline
        y_pos -= line_height * 0.8

        # Individual Results
        p.setFont("Helvetica", 8)
        for result in results:
            if y_pos < margin + 50:  # Check for page break
                p.showPage()
                y_pos = height - margin
                # Redraw table header on new page
                p.setFont("Helvetica-Bold", 9)
                for header, x_pos in zip(headers, x_positions):
                    p.drawString(x_pos, y_pos, header)
                y_pos -= line_height * 0.8
                p.line(margin, y_pos, width - margin, y_pos)
                y_pos -= line_height * 0.8
                p.setFont("Helvetica", 8)

            # Draw row data with truncation to prevent overflow
            student_name = str(result.get('studentName', ''))[:25]  # Truncate long names
            exam_name = str(result.get('examName', ''))[:15]  # Truncate long exam names
            p.drawString(x_positions[0], y_pos, student_name)
            p.drawString(x_positions[1], y_pos, str(result.get('studentId', '')))
            p.drawString(x_positions[2], y_pos, exam_name)
            p.drawString(x_positions[3], y_pos, f"{result.get('score', 0)}/{result.get('totalMarks', 0)}")
            p.drawString(x_positions[4], y_pos, f"{result.get('percentage', 0):.1f}%")
            
            if result.get('passFailStatus') == 'Pass':
                p.setFillColorRGB(0, 0.5, 0)
            else:
                p.setFillColorRGB(1, 0, 0)
            p.drawString(x_positions[5], y_pos, str(result.get('passFailStatus', '')))
            p.setFillColorRGB(0, 0, 0)
            
            y_pos -= line_height * 0.9

        p.save()
        buffer.seek(0)

        logger.info("Generated summary PDF")
        return StreamingResponse(
            io.BytesIO(buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=OMR_Results_Report.pdf"}
        )

    except Exception as e:
        logger.error(f"Failed to generate summary PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

@router.get("/exam/{exam_id}")
async def get_exam_results(
    exam_id: str,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "processedAt",
    order: str = "desc",
    db=Depends(get_database)
):
    try:
        logger.info(f"Fetching results for exam {exam_id}")
        
        query = {"examId": exam_id} if exam_id else {}
        
        if exam_id:
            exam = await db.exams.find_one({"examId": exam_id})
            if not exam:
                logger.error(f"Exam {exam_id} not found")
                raise HTTPException(status_code=404, detail="Exam not found")

        sort_order = -1 if order == "desc" else 1
        skip = (page - 1) * limit

        cursor = db.results.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
        responses = await cursor.to_list(length=None)

        total = await db.results.count_documents(query)

        for response in responses:
            response['_id'] = str(response['_id'])

        stats = await calculate_exam_stats(exam_id, db) if exam_id else {}

        logger.info(f"Retrieved {len(responses)} results" + (f" for exam {exam_id}" if exam_id else ""))
        return {
            "responses": responses,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            },
            "statistics": stats
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch results: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch results")

async def calculate_exam_stats(exam_id: str, db):
    try:
        logger.info(f"Calculating stats for exam {exam_id}")
        cursor = db.results.find({"examId": exam_id})
        responses = await cursor.to_list(length=None)
        
        exam = await db.exams.find_one({"examId": exam_id})

        if not responses:
            logger.info(f"No results found for exam {exam_id}")
            return {
                "totalStudents": 0,
                "averageScore": 0,
                "highestScore": 0,
                "lowestScore": 0,
                "passingRate": 0,
                "scoreDistribution": [],
                "questionAnalysis": []
            }

        scores = [r["score"] for r in responses]
        total_students = len(responses)
        average_score = sum(scores) / total_students if total_students > 0 else 0
        highest_score = max(scores) if scores else 0
        lowest_score = min(scores) if scores else 0
        
        passing_score = exam.get("settings", {}).get("passingScore", 60)
        passing_count = len([s for s in scores if (s / exam["numQuestions"]) * 100 >= passing_score])
        passing_rate = (passing_count / total_students) * 100 if total_students > 0 else 0

        ranges = [
            {"min": 0, "max": 20, "label": "0-20%"},
            {"min": 21, "max": 40, "label": "21-40%"},
            {"min": 41, "max": 60, "label": "41-60%"},
            {"min": 61, "max": 80, "label": "61-80%"},
            {"min": 81, "max": 100, "label": "81-100%"}
        ]

        score_distribution = []
        for range_item in ranges:
            count = len([s for s in scores if range_item["min"] <= (s / exam["numQuestions"]) * 100 <= range_item["max"]])
            score_distribution.append({
                "range": range_item["label"],
                "count": count,
                "percentage": (count / total_students) * 100 if total_students > 0 else 0
            })

        logger.info(f"Calculated stats for exam {exam_id}: {total_students} students, {passing_rate:.1f}% passing")
        return {
            "totalStudents": total_students,
            "averageScore": round(average_score, 2),
            "highestScore": highest_score,
            "lowestScore": lowest_score,
            "passingRate": round(passing_rate, 2),
            "scoreDistribution": score_distribution,
            "questionAnalysis": []
        }
    except Exception as e:
        logger.error(f"Failed to calculate stats for exam {exam_id}: {str(e)}")
        raise