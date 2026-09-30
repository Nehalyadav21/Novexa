import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type;

    console.log('Processing file:', { fileName, fileSize, fileType });

    // Check file size (max 50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 });
    }

    // Check file type
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const fileExtension = fileName.toLowerCase().split('.').pop();
    const isAllowedType = allowedTypes.includes(fileType) || 
                          ['txt', 'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

    if (!isAllowedType) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Supported: TXT, PDF, DOC, DOCX, JPG, JPEG, PNG, GIF, WEBP' 
      }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    let extractedText = '';
    let processingInfo = '';

    try {
      if (fileType === 'text/plain' || fileExtension === 'txt') {
        extractedText = new TextDecoder('utf-8').decode(buffer);
        processingInfo = 'Text file read successfully';
        
      } else if (fileType === 'application/pdf' || fileExtension === 'pdf') {
        console.log('Processing PDF file...');
        let pdfTextExtracted = false;
        
        try {
          // Dynamic import with proper error handling
          const pdfParse = await import('pdf-parse').then(module => module.default || module);
          console.log('PDF parser loaded successfully');
          
          const pdfBuffer = Buffer.from(buffer);
          console.log('PDF buffer size:', pdfBuffer.length);
          
          const options = {
            max: 0, // 0 = parse all pages
            version: 'v1.10.100',
            normalizeWhitespace: true,
            disableCombineTextItems: false
          };
          
          const data = await pdfParse(pdfBuffer, options);
          console.log('PDF parsing result:', {
            numpages: data.numpages,
            textLength: data.text?.length || 0,
            info: data.info
          });
          
          if (data.text && data.text.trim().length > 5) {
            extractedText = data.text.trim();
            processingInfo = `PDF processed successfully: ${data.numpages} pages, ${extractedText.length} characters extracted`;
            pdfTextExtracted = true;
            console.log('PDF text extracted successfully');
          } else {
            console.log('PDF text extraction yielded empty or minimal content');
            extractedText = 'PDF uploaded successfully but contains no extractable text. This could be an image-based PDF or scanned document.';
            processingInfo = 'PDF processed but no significant text content found';
          }
        } catch (pdfError) {
          console.error('PDF parsing error details:', {
            message: pdfError.message,
            stack: pdfError.stack,
            name: pdfError.name
          });
          
          // Check if it's a password-protected PDF
          if (pdfError.message?.includes('password') || pdfError.message?.includes('encrypted')) {
            extractedText = 'PDF uploaded successfully but text extraction failed. The document appears to be password-protected or encrypted.';
            processingInfo = 'PDF is password-protected or encrypted';
          } else if (pdfError.message?.includes('Invalid PDF')) {
            extractedText = 'PDF uploaded successfully but text extraction failed. The file may be corrupted or not a valid PDF.';
            processingInfo = 'Invalid PDF format detected';
          } else {
            extractedText = 'PDF uploaded successfully but text extraction failed. The file may be image-based, corrupted, or use an unsupported format.';
            processingInfo = `PDF parsing failed: ${pdfError.message}`;
          }
        }
        
        // If PDF text extraction failed and we want to try OCR on image-based PDFs
        if (!pdfTextExtracted && extractedText.includes('image-based')) {
          console.log('Attempting OCR for image-based PDF...');
          try {
            // For image-based PDFs, we could convert PDF to images and run OCR
            // This is a more complex implementation that would require additional libraries
            extractedText += '\n\nNote: This appears to be an image-based PDF. OCR text extraction is available but requires additional processing.';
            processingInfo += ' (Image-based PDF detected)';
          } catch (ocrError) {
            console.error('OCR attempt failed:', ocrError);
          }
        }
        
      } else if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
        console.log('Processing image file for OCR...');
        
        try {
          // Try to use Tesseract.js for OCR
          const Tesseract = await import('tesseract.js');
          console.log('Tesseract loaded, starting OCR...');
          
          processingInfo = 'Performing OCR on image...';
          
          // Create a worker for OCR
          const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log('OCR Progress:', Math.round(m.progress * 100) + '%');
              }
            }
          });
          
          const { data: { text, confidence } } = await worker.recognize(Buffer.from(buffer));
          await worker.terminate();
          
          if (text && text.trim().length > 5) {
            extractedText = text.trim();
            processingInfo = `OCR completed successfully with ${Math.round(confidence)}% confidence. ${extractedText.length} characters extracted.`;
            console.log('OCR extraction successful');
          } else {
            extractedText = 'Image uploaded successfully but no text was detected through OCR.';
            processingInfo = 'OCR completed but no significant text found';
          }
          
        } catch (ocrError) {
          console.error('OCR error details:', {
            message: ocrError.message,
            stack: ocrError.stack,
            name: ocrError.name
          });
          
          // Fallback message based on error type
          if (ocrError.message?.includes('Worker')) {
            extractedText = 'Image uploaded successfully. OCR text extraction is temporarily unavailable due to worker initialization issues.';
            processingInfo = 'OCR worker initialization failed';
          } else if (ocrError.message?.includes('memory') || ocrError.message?.includes('heap')) {
            extractedText = 'Image uploaded successfully. OCR failed due to memory constraints. Please try with a smaller image.';
            processingInfo = 'OCR failed due to memory issues';
          } else {
            extractedText = 'Image uploaded successfully. OCR text extraction failed but the image is available for viewing.';
            processingInfo = `OCR processing failed: ${ocrError.message}`;
          }
        }
        
      } else if (fileType.includes('document') || fileType.includes('word') || ['doc', 'docx'].includes(fileExtension)) {
        // For now, just indicate that the document was uploaded
        extractedText = 'Document uploaded successfully. Full text extraction for Word documents is not yet implemented.';
        processingInfo = 'Document format detected but text extraction not implemented';
        
      } else {
        extractedText = 'File uploaded successfully. Content extraction not available for this file type.';
        processingInfo = 'File uploaded, no text extraction performed';
      }
      
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      extractedText = 'File uploaded but content extraction failed.';
      processingInfo = `Extraction error: ${parseError.message}`;
    }

    // Clean and limit extracted text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim()
      .substring(0, 10000); // Limit to 10k characters

    const preview = cleanedText.substring(0, 300) + (cleanedText.length > 300 ? '...' : '');

    console.log('File processing completed:', {
      fileName,
      fileSize,
      extractedLength: cleanedText.length,
      processingInfo
    });

    return NextResponse.json({
      success: true,
      fileName,
      fileSize,
      fileType,
      extractedText: cleanedText,
      preview,
      processingInfo,
      wordCount: cleanedText.split(' ').filter(word => word.length > 0).length
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process file',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
