document.getElementById("extractTextButton").addEventListener("click", async () => {
    const pdfUpload = document.getElementById("pdfUpload").files[0];

    if (!pdfUpload) {
        alert("Please upload a PDF file.");
        return;
    }

    console.log("PDF uploaded:", pdfUpload.name);
    disableButton(true);  // Disable the button during processing

    // Use FileReader to load the PDF file
    const fileReader = new FileReader();

    fileReader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        console.log("File loaded, processing PDF...");

        try {
            const pdf = await pdfjsLib.getDocument(typedArray).promise;
            let extractedText = "";

            // Loop through each page and extract text
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                console.log(`Extracting text from page ${pageNum}`);

                const content = await page.getTextContent();
                const pageText = content.items.map(item => item.str).join(" ");

                // If the page has text, add it to the output
                if (pageText.trim()) {
                    extractedText += `Page ${pageNum}:\n${pageText}\n\n`;
                } else {
                    // Apply OCR if no text is found
                    console.log(`No text found on page ${pageNum}, applying OCR...`);
                    await applyOCR(page, pageNum);
                }
            }

            // Display extracted text
            if (extractedText.trim()) {
                document.getElementById("extractedText").textContent = extractedText;
                
                // Generate a summary and display it
                const summary = summarizeText(extractedText);
                document.getElementById("summaryText").textContent = summary;

                // Generate charts from extracted data
                generateCharts(extractedText);
            } else {
                throw new Error("No text extracted or OCR result found.");
            }

        } catch (error) {
            console.error("Error while processing PDF:", error.message);
            alert("Could not extract text from the PDF.");
        } finally {
            disableButton(false);  // Re-enable the button after processing
        }
    };

    fileReader.readAsArrayBuffer(pdfUpload);

    // Function to apply OCR to a PDF page
    async function applyOCR(page, pageNumber) {
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render the page content to the canvas
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // Use Tesseract.js to apply OCR to the canvas
        Tesseract.recognize(
            canvas.toDataURL(),
            'eng',
            {
                logger: (m) => console.log(m), // Logs OCR progress
            }
        ).then(({ data: { text } }) => {
            console.log("OCR result from page:", text);
            document.getElementById("extractedText").textContent += `OCR Text from page ${pageNumber}:\n${text}\n\n`;
        }).catch((error) => {
            console.error("OCR failed:", error);
        });
    }

    // Function to summarize the extracted text
    function summarizeText(text) {
        // A basic summary function (you can replace this with more advanced NLP models)
        const maxLength = 500; // Limit summary to 500 characters
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "..."; // Truncate the text for summary
    }

    // Function to generate charts from the extracted text
    function generateCharts(text) {
        // Look for numbers or data patterns in the extracted text
        const dataPattern = /\b(\d+(\.\d+)?)\b/g;
        const numbers = [...text.matchAll(dataPattern)].map(match => parseFloat(match[0]));

        if (numbers.length >= 2) {
            // Draw a simple pie chart if we have numerical data
            const ctx = document.getElementById("chart").getContext("2d");
            const chartData = {
                labels: ['Data 1', 'Data 2', 'Data 3'],
                datasets: [{
                    data: numbers.slice(0, 3),
                    backgroundColor: ['#FF5733', '#33FF57', '#3357FF']
                }]
            };
            new Chart(ctx, {
                type: 'pie',
                data: chartData,
            });
        } else {
            console.log("Not enough data for visualization.");
        }
    }

    // Disable the button to prevent multiple clicks
    function disableButton(disable) {
        document.getElementById("extractTextButton").disabled = disable;
    }
});
