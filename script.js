const pdfInput = document.getElementById('pdfInput');
const pdfPreview = document.getElementById('pdfPreview');
const thumbnails = document.getElementById('thumbnails');
const toggleSizeButton = document.getElementById('toggleSizeButton');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const pageCountDisplay = document.getElementById('pageCount');
const pageInput = document.getElementById('pageInput');
let pdfDoc = null;
let isFullSize = false;

// تحميل ملف PDF
pdfInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        fileNameDisplay.textContent = `${file.name}`;
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedArray = new Uint8Array(this.result);
            renderPDF(typedArray);
        };
        fileReader.readAsArrayBuffer(file);
    }
});

// رسم PDF
function renderPDF(typedArray) {
    const loadingTask = pdfjsLib.getDocument(typedArray);
    loadingTask.promise.then(pdf => {
        pdfDoc = pdf;
        thumbnails.innerHTML = '';
        pdfPreview.innerHTML = ''; // Clear previous pages
        pageCountDisplay.textContent = `Page 1 of ${pdf.numPages}`; // Display page count

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            pdf.getPage(pageNum).then(page => {
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                canvas.classList.add('pdf-page');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.id = `page-${pageNum}`;
                canvas.setAttribute('data-original-width', viewport.width);
                canvas.setAttribute('data-original-height', viewport.height);

                const context = canvas.getContext('2d');
                page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                    const thumbnail = document.createElement('div');
                    thumbnail.classList.add('thumbnail');
                    thumbnail.id = `thumbnail-${pageNum}`;
                    thumbnail.onclick = () => showPage(pageNum);
                    const img = document.createElement('img');
                    img.src = canvas.toDataURL();
                    thumbnail.appendChild(img);
                    thumbnails.appendChild(thumbnail);

                    pdfPreview.appendChild(canvas); // Add canvas to the preview after thumbnail is created
                });
            });
        }
    }).catch(error => {
        console.error('Error loading PDF:', error);
    });
}


function initializeScrollSync() {
    const pdfPreview = document.getElementById('pdfPreview');
    const thumbnails = document.getElementById('thumbnails');

    pdfPreview.addEventListener('scroll', () => {
        const pageCanvases = pdfPreview.querySelectorAll('canvas');
        let currentPage = 1;

        // تحديد الصفحة المرئية بناءً على التمرير
        pageCanvases.forEach((canvas, index) => {
            const rect = canvas.getBoundingClientRect();
            if (rect.top >= 0 && rect.top < window.innerHeight) {
                currentPage = index + 1;
            }
        });

        // تحديث التحديد في الصور المصغرة
        updateThumbnailSelection(currentPage);
    });

    // إضافة حدث النقر على الصور المصغرة
    thumbnails.addEventListener('click', (event) => {
        const thumbnail = event.target.closest('.thumbnail');
        if (!thumbnail) return; // إذا لم يتم النقر على صورة مصغرة، تجاهل
        const pageNum = parseInt(thumbnail.id.replace('thumbnail-', ''), 10);

        // تحديث التحديد عند النقر
        updateThumbnailSelection(pageNum);

        // التمرير إلى الصفحة المحددة في الـ PDF
        showPage(pageNum);
    });
}

// وظيفة لتحديث التحديد
function updateThumbnailSelection(currentPage) {
    const thumbnails = document.getElementById('thumbnails');
    const thumbnailElements = thumbnails.querySelectorAll('.thumbnail');

    thumbnailElements.forEach((thumbnail, index) => {
        if (index + 1 === currentPage) {
            thumbnail.classList.add('selected');
            // تمرير الصور المصغرة إلى الصفحة الحالية
            thumbnails.scrollTo({
                top: thumbnail.offsetTop - thumbnails.offsetHeight / 2,
                behavior: 'smooth',
            });
        } else {
            thumbnail.classList.remove('selected');
        }
    });
}

// استدعاء الوظيفة عند تحميل المستند
document.addEventListener('DOMContentLoaded', () => {
    initializeScrollSync();
});


// استدعاء الوظيفة عند تحميل المستند
document.addEventListener('DOMContentLoaded', () => {
    initializeScrollSync();
});



// عرض الصفحة المحددة
function showPage(pageNum) {
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) {
        alert('هذه الصفحة غير موجودة!');
        return;
    }

    const pdfPreview = document.getElementById('pdfPreview');
    const selectedCanvas = document.getElementById(`page-${pageNum}`);
    
    if (selectedCanvas) {
        // احصل على موقع الصفحة المحددة
        const pageRect = selectedCanvas.getBoundingClientRect();
        const pdfPreviewRect = pdfPreview.getBoundingClientRect();
        
        // تحقق مما إذا كانت الصفحة المحددة في حدود عرض الـ PDF
        if (pageRect.top < pdfPreviewRect.top || pageRect.bottom > pdfPreviewRect.bottom) {
            // إذا كانت الصفحة خارج الحدود، قم بالتمرير
            pdfPreview.scrollTo({
                top: pdfPreview.scrollTop + (pageRect.top - pdfPreviewRect.top),
                behavior: 'smooth' // تأثير تمرير سلس
            });
        }

        // تمييز الصورة المصغرة المحددة
        const allThumbnails = document.querySelectorAll('.thumbnail');
        allThumbnails.forEach(thumbnail => thumbnail.classList.remove('selected'));

        const selectedThumbnail = document.getElementById(`thumbnail-${pageNum}`);
        if (selectedThumbnail) {
            selectedThumbnail.classList.add('selected');
        }

        // تحديث إدخال الرقم وعرض عدد الصفحات
        pageInput.value = pageNum;
        pageCountDisplay.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
    }
}





// حدث لتغيير الرقم المدخل في صفحة الإدخال
pageInput.addEventListener('change', () => {
    // تحويل الأرقام العربية إلى أرقام إنجليزية
    const normalizeNumber = (num) => {
        return num.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    };

    // تطبيع قيمة الإدخال
    const input = normalizeNumber(pageInput.value);
    const pageNum = parseInt(input);
    const pageHeight = 889; // تحديد ارتفاع الصفحة الثابت

    if (pageNum > 0 && pageNum <= pdfDoc.numPages) {
        showPage(pageNum);

        // حساب موضع الصفحة في pdfPreview
        const pdfPreview = document.getElementById('pdfPreview');

        // استخدام موضع الصفحة المستهدفة لحساب موضع التمرير
        const targetScrollTop = (pageNum - 1) * pageHeight; // حساب موضع التمرير
        
        // تمرير إلى الموضع الصحيح
        pdfPreview.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth' // تأثير تمرير سلس
        });
    } else {
        alert('رقم الصفحة غير صحيح!');
        pageInput.value = ''; // مسح الإدخال إذا كان رقم الصفحة غير صحيح
    }
});


// حدث للتمرير بين الصفحات عند التمرير
pdfPreview.addEventListener('scroll', () => {
    const pages = document.querySelectorAll('.pdf-page');
    pages.forEach((page, index) => {
        const rect = page.getBoundingClientRect();
        const pdfPreviewRect = pdfPreview.getBoundingClientRect();

        if (rect.top >= pdfPreviewRect.top && rect.bottom <= pdfPreviewRect.bottom) {
            const allThumbnails = document.querySelectorAll('.thumbnail');
            allThumbnails.forEach(thumbnail => thumbnail.classList.remove('selected'));

            const selectedThumbnail = allThumbnails[index];
            if (selectedThumbnail) {
                selectedThumbnail.classList.add('selected');
            }
        }
    });
});

// وظيفة لتغيير حجم الصفحات
// تعريف الوظيفة لإظهار أو إخفاء العنصر

function toggleThumbnails() {
            const thumbnails = document.getElementById('thumbnails');
            const currentDisplay = window.getComputedStyle(thumbnails).display;
            const isMobile = window.matchMedia('(max-width: 800px)').matches;

            if (currentDisplay === 'none' || thumbnails.classList.contains('hidden')) {
                thumbnails.style.display = 'block';
                setTimeout(() => {
                    thumbnails.classList.remove('hidden');
                }, 10);
            } else {
                thumbnails.classList.add('hidden');
                const animationDuration = isMobile ? 100 : 0;
                setTimeout(() => {
                    thumbnails.style.display = 'none';
                }, animationDuration);
            }
        }

        function enableSwipeToClose(element) {
            let startX = 0;
            let endX = 0;

            element.addEventListener('touchstart', (event) => {
                startX = event.touches[0].clientX;
            });

            element.addEventListener('touchmove', (event) => {
                endX = event.touches[0].clientX;
                const deltaX = endX - startX;
                if (deltaX < 0) {
                    element.style.transform = `translateX(${deltaX}px)`;
                }
            });

            element.addEventListener('touchend', () => {
                const isMobile = window.matchMedia('(max-width: 768px)').matches;
                const animationDuration = isMobile ? 100 : 0;

                if (startX - endX > 200) {
                    element.classList.add('hidden');
                    setTimeout(() => {
                        element.style.display = 'none';
                        element.style.transform = '';
                    }, animationDuration);
                } else {
                    element.style.transform = '';
                }
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            const thumbnails = document.getElementById('thumbnails');
            if (thumbnails) {
                enableSwipeToClose(thumbnails);
            }

            const toggleButton = document.getElementById('toggleButton');
            if (toggleButton) {
                toggleButton.addEventListener('click', toggleThumbnails);
            }
        });

// إضافة الأحداث
document.addEventListener('DOMContentLoaded', function () {
    const button = document.getElementById('toggleButton'); // الزر الذي يتحكم في العرض
    const thumbnails = document.getElementById('thumbnails'); // العنصر الذي سيتم إخفاؤه أو عرضه

    button.addEventListener('click', function () {
        // عند الضغط على الزر، تبديل العرض
        toggleThumbnails();
    });

    document.addEventListener('click', function (event) {
        // التحقق من حجم الشاشة
        if (window.innerWidth <= 780) {
            // إذا كان النقر خارج العنصر والزر، قم بإخفاء العنصر
            if (
                thumbnails.style.display === 'block' &&
                !thumbnails.contains(event.target) &&
                event.target !== button
            ) {
                thumbnails.style.display = 'none';
            }
        }
    });
});
        

// وظيفة لتنزيل PDF
function downloadPDF() {
    const pdfInput = document.getElementById('pdfInput');
    
    if (pdfInput.files.length === 0) {
        alert("Please select a PDF file first.");
        return;
    }
    
    const confirmDownload = confirm("Are you sure you want to download the PDF?");
    if (confirmDownload) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfInput.files[0]);
        link.download = pdfInput.files[0].name;
        link.click();
    }
}

// وظيفة لطباعة PDF
function printPDF() {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = URL.createObjectURL(pdfInput.files[0]);
    document.body.appendChild(iframe);
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    document.body.removeChild(iframe);
}

// وظيفة لتدوير الصفحات 
function rotatePages() {
    const pages = document.querySelectorAll('.pdf-page');

    pages.forEach((page) => {
        let currentRotation = page.getAttribute('data-rotation') || 0;
        currentRotation = (parseInt(currentRotation) + 90) % 360;
        page.setAttribute('data-rotation', currentRotation);
        page.style.transform = `rotate(${currentRotation}deg)`;
        page.style.transformOrigin = 'center';

        // تأكد من أن الصفحات تبقى بحجم يمكن مشاهدته
        page.style.margin = '0px auto';
        page.style.width = 'auto';
        page.style.height = '100%';
    });
}

// وظيفة لإلغاء التدوير
function resetPageRotation() {
    const pages = document.querySelectorAll('.pdf-page');

    pages.forEach((page) => {
        page.setAttribute('data-rotation', 0);
        page.style.transform = 'none'; // إلغاء التحويل
        page.style.margin = '0px auto';
        page.style.width = 'auto';
        page.style.height = '100%';
    });
}

// إضافة حدث للزر toggleSizeButton
document.getElementById('toggleSizeButton').addEventListener('click', function() {
    // استدعاء وظيفة إلغاء التدوير
    resetPageRotation();
});


// حدث لتغيير حجم الصفحات عند الضغط على الزر
toggleSizeButton.addEventListener('click', () => {
    const pages = pdfPreview.querySelectorAll('.pdf-page');

    if (isFullSize) {
        pages.forEach((page) => {
            page.style.width = 'auto';
            page.style.height = '100%';
            page.style.margin = 'auto';
        });
        toggleSizeButton.innerHTML = '<span class="material-symbols-outlined">width</span>';
        
        // إخفاء "Auto" والعودة إلى النسبة الأصلية
        sizeInput.value = '100%'; // تعيين القيمة الأصلية
        currentSizePercentage = 100; // إعادة تعيين النسبة الحالية إلى القيمة الأصلية
    } else {
        pages.forEach((page) => {
            page.style.width = '-webkit-fill-available';
            page.style.height = 'auto';
            page.style.margin = '10px';
        });
        toggleSizeButton.innerHTML = '<span class="material-symbols-outlined">height</span>';
        sizeInput.value = 'Auto'; // تحديث خانة الإدخال إلى "Auto"
    }

    isFullSize = !isFullSize; // تغيير حالة الحجم
});


const increaseSizeButton = document.getElementById('increaseSize');
const decreaseSizeButton = document.getElementById('decreaseSize');
const sizeInput = document.getElementById('sizeInput');
let currentSizePercentage = 100; // القيمة الابتدائية للحجم

// وظيفة لزيادة حجم الصفحات
increaseSizeButton.addEventListener('click', () => {
    if (currentSizePercentage < 170) {
        currentSizePercentage += 10; // زيادة الحجم بمقدار 10%
        updatePageSizes();
    }
});

// وظيفة لتقليل حجم الصفحات
decreaseSizeButton.addEventListener('click', () => {
    if (currentSizePercentage > 100) {
        currentSizePercentage -= 10; // تقليل الحجم بمقدار 10%
        updatePageSizes();
    }
});

// وظيفة لتحديث حجم الصفحات وعرضه في خانة الإدخال
function updatePageSizes() {
    const pages = pdfPreview.querySelectorAll('.pdf-page');
    const baseHeight = 889; // استخدم الارتفاع الأساسي للصفحة (يمكنك تعديله حسب الحاجة)
    const newHeight = (currentSizePercentage / 100) * baseHeight; // حساب الارتفاع الجديد

    pages.forEach((page) => {
        page.style.height = `${newHeight}px`; // تحديث الارتفاع لكل صفحة
        page.style.width = 'auto'; // تأكد من أن العرض تلقائي
    });
    
    sizeInput.value = `${currentSizePercentage}%`; // تحديث خانة الإدخال
}

// إضافة متغيرات جديدة
const toggleCheck = document.getElementById('toggleCheck');
const checkIcon = document.getElementById('checkIcon');
// const thumbnails = document.getElementById('thumbnails'); // إضافة ديف thumbnails
let isTwoPagesSideBySide = false;

// حدث عند الضغط على الديف
toggleCheck.addEventListener('click', () => {
    const pages = pdfPreview.querySelectorAll('.pdf-page');

    if (isTwoPagesSideBySide) {
        // العودة إلى الوضع الأصلي
        pages.forEach((page) => {
            page.style.display = 'block'
            page.style.width = 'auto'; // تعيين العرض التلقائي
            page.style.margin = '0px auto'; // إعادة تعيين الهوامش
            page.style.height = '889px';
        });
        checkIcon.style.display = 'none'; // إخفاء أيقونة check
        thumbnails.style.display = 'block';
        thumbnails.style.position = 'static'; // إعادة موضع thumbnails إلى الوضع الأصلي
    } else {
        // عرض كل صفحتين بجانب بعض
        pages.forEach((page, index) => {
            page.style.display = 'inline-flex'; // تعيين العرض كتلة مدمجة
            page.style.width = 'calc(40% - 10px)'; // تعيين عرض الصفحة
            // page.style.margin = '5px'; // إضافة هوامش
            page.style.height = 'auto';
        });
        checkIcon.style.display = 'inline'; // إظهار أيقونة check
        thumbnails.style.display = 'none';
        thumbnails.style.height = '-webkit-fill-available';
        thumbnails.style.position = 'absolute'; // تغيير موضع thumbnails إلى absolute
    }

    isTwoPagesSideBySide = !isTwoPagesSideBySide; // تغيير الحالة
});

document.getElementById('copyTextButton').addEventListener('click', async () => {
    if (!pdfDoc) {
        alert('لم يتم تحميل ملف PDF بعد!');
        return;
    }

    const allText = [];
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // فرز النصوص حسب الإحداثيات Y ثم X
        const textItems = textContent.items.map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
        }));

        textItems.sort((a, b) => {
            // ترتيب النصوص حسب الإحداثيات Y ثم X
            if (b.y === a.y) return a.x - b.x;
            return b.y - a.y;
        });

        // معالجة النصوص العربية بطريقة صحيحة
        const lines = [];
        let currentY = null;
        let line = [];

        textItems.forEach(item => {
            if (currentY === null || Math.abs(currentY - item.y) > 5) {
                if (line.length > 0) {
                    lines.push(line);
                }
                line = [];
                currentY = item.y;
            }
            line.push(item.str);
        });

        if (line.length > 0) {
            lines.push(line);
        }

        // عكس الكلمات في كل سطر لتناسب النص العربي
        const pageText = lines
            .map(line => line.reverse().join(' ')) // عكس الكلمات في كل سطر
            .join('\n'); // فصل الأسطر

        allText.push(`صفحة ${pageNum}:\n${pageText}`);
    }

    const finalText = allText.join('\n\n');

    // نسخ النصوص إلى الحافظة
    navigator.clipboard.writeText(finalText).then(() => {
        alert('تم نسخ النصوص بدقة لجميع الصفحات إلى الحافظة!');
    }).catch(err => {
        console.error('خطأ أثناء النسخ:', err);
        alert('حدث خطأ أثناء نسخ النصوص!');
    });
});


// زر تحميل جميع الصفحات كصور في ملف ZIP
document.getElementById('downloadImagesZipButton').addEventListener('click', async () => {
    if (!pdfDoc) {
        alert('لم يتم تحميل ملف PDF بعد!');
        return;
    }

    const confirmDownload = confirm("هل أنت متأكد أنك تريد تحميل جميع الصفحات كصور في ملف ZIP؟");
    if (confirmDownload) {
        const zip = new JSZip();
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');
            zip.file(`page-${pageNum}.png`, dataUrl.split(',')[1], { base64: true });
        }

        zip.generateAsync({ type: 'blob' }).then(blob => {
            saveAs(blob, 'pdf_pages.zip');
        });
    }
});

// زر مشاركة الملف
document.getElementById('shareFileButton').addEventListener('click', async () => {
        const pdfInput = document.getElementById('pdfInput'); // افتراض أن ملف PDF يتم تحميله من هنا
        if (!pdfInput || !pdfInput.files[0]) {
            alert('لم يتم تحميل ملف PDF للمشاركة!');
            return;
        }

        // التحقق من دعم Web Share API
        if (navigator.canShare && navigator.canShare({ files: [pdfInput.files[0]] })) {
            try {
                await navigator.share({
                    title: 'مشاركة ملف PDF',
                    text: 'تفقد هذا الملف الرائع!',
                    files: [pdfInput.files[0]],
                });
                alert('تمت مشاركة الملف بنجاح!');
            } catch (error) {
                console.error('حدث خطأ أثناء مشاركة الملف:', error);
                alert('تعذر مشاركة الملف.');
            }
        } else {
            alert('المشاركة غير مدعومة على هذا الجهاز!');
        }
    });

    document.getElementById('fileInfoButton').addEventListener('click', () => {
    // تحديد الملف المُحمّل
    const fileInput = document.getElementById('pdfInput');
    const file = fileInput.files[0];

    if (file) {
        const fileSize = (file.size / 1024).toFixed(2); // حجم الملف بالـ KB
        const fileName = file.name;
        const fileURL = URL.createObjectURL(file); // رابط الملف المؤقت
        const lastModified = new Date(file.lastModified).toLocaleString(); // آخر تعديل

        // عرض المعلومات في رسالة
        alert(` ملف  ${fileName}\nالحجم ${fileSize} KB\nالمسار  ${fileURL}\nآخر تعديل في  ${lastModified}`);
    } else {
        alert('لم يتم تحميل أي ملف!');
    }
});

// الحفظ التقائي





























const dropdownButton = document.getElementById('dropdownButton');
const dropdownMenu = document.getElementById('dropdownMenu');

dropdownButton.addEventListener('click', function(event) {
    event.stopPropagation(); // لمنع الحدث من الانتقال إلى العناصر الأبوية
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    dropdownButton.classList.toggle('active');
});

// إخفاء القائمة فقط عند النقر خارجها إذا كانت معروضة
document.addEventListener('click', function(event) {
    if (dropdownMenu.style.display === 'block' && !dropdownMenu.contains(event.target) && !dropdownButton.contains(event.target)) {
        dropdownMenu.style.display = 'none';
        dropdownButton.classList.remove('active');
    }
});





// استهداف جميع الأزرار
const buttons = document.querySelectorAll('.mmyButton');

buttons.forEach(button => {
    const handleStart = function(event) {
        // الحصول على حجم الزر
        const buttonWidth = button.offsetWidth;
        const buttonHeight = button.offsetHeight;

        // الحصول على موضع الضغط داخل الزر
        const touch = event.touches ? event.touches[0] : event; // لللمس أو الفأرة
        const mouseX = touch.clientX - button.getBoundingClientRect().left;
        const mouseY = touch.clientY - button.getBoundingClientRect().top;

        // حساب نسبة الموضع بالنسبة للعرض والارتفاع
        const rotateX = ((mouseY / buttonHeight) - 0.5) * 20; // لتدوير حول محور X
        const rotateY = ((mouseX / buttonWidth) - 0.5) * 20; // لتدوير حول محور Y

        // تطبيق التحول على الزر
        button.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleEnd = function() {
        // إعادة تعيين التحول عند انتهاء الضغط أو اللمس
        button.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
    };

    // إضافة الأحداث
    button.addEventListener('mousedown', handleStart);
    button.addEventListener('mouseup', handleEnd);
    button.addEventListener('mouseleave', handleEnd);

    button.addEventListener('touchstart', handleStart);
    button.addEventListener('touchend', handleEnd);
    button.addEventListener('touchcancel', handleEnd);

    // التأكد من عدم إلغاء وظيفة الزر الأساسية
    button.addEventListener('click', function(event) {
        console.log(`Button "${button.textContent}" clicked!`); // فقط للتجربة
    });
});




// ---------------------------------------------

// جلب جميع الأزرار التي تفتح النوافذ
const openModalBtns = document.querySelectorAll('.openModalBtn');

// جلب جميع الأزرار التي تغلق النوافذ
const closeModalBtns = document.querySelectorAll('.closeModalBtn');

// فتح النوافذ عند النقر على الأزرار
openModalBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetModal = document.getElementById(targetId);
    targetModal.classList.remove('xoo');
  });
});

// إغلاق النوافذ عند النقر على أزرار الإغلاق
closeModalBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.cox');
    // إضافة الكلاس لإخفاء النافذة
    modal.classList.add('xoo');
    // إخفاء أي عنصر داخلي يحتوي على class popup
    const popups = modal.querySelectorAll('.popup');
    popups.forEach((popup) => {
      popup.style.display = 'none';
    });
  });
});

// منع التفاعل مع العناصر خارج النافذة المنبثقة
const coxs = document.querySelectorAll('.cox');
coxs.forEach((cox) => {
  cox.addEventListener('click', (e) => {
    if (e.target === cox) {
      cox.classList.add('xoo');
      // إخفاء أي عنصر داخلي يحتوي على class popup
      const popups = cox.querySelectorAll('.popup');
      popups.forEach((popup) => {
        popup.style.display = 'none';
      });
    }
  });
});

// ---------------------------------------------



// دالة الإغلاق باستخدام onclick
function closePopup(button) {
    const popup = button.closest('.popup'); // العثور على العنصر الأب (div) ذو الكلاس .popup
    if (popup) {
      popup.style.display = 'none'; // إخفاء العنصر
    }
  }
  
  window.addEventListener('load', () => {
    // ------------------------------
    // جميع أزرار الإظهار
    const showButtons = document.querySelectorAll('.showButton');
  
    // إضافة حدث لكل زر إظهار
    showButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target'); // الحصول على ID العنصر المستهدف
        const targetPopup = document.getElementById(targetId); // العثور على العنصر
        if (targetPopup) {
          targetPopup.style.display = 'block'; // إظهار العنصر
        }
      });
    });
  
    // ---------------------
    
    // الحصول على كل العناصر
    const toggleSwitches = document.querySelectorAll('.toggle-switch');

    toggleSwitches.forEach((toggleSwitch, index) => {
      let isDragging = false;
      let startX = 0;

      // استعادة الحالة من localStorage
      const isActive = localStorage.getItem(`toggleState-${index}`) === 'true';
      if (isActive) {
        toggleSwitch.classList.add('active');
      }

      // تحديث الحالة عند النقر
      const toggleState = () => {
        if (!isDragging) {
          toggleSwitch.classList.toggle('active');
          const isActive = toggleSwitch.classList.contains('active');
          localStorage.setItem(`toggleState-${index}`, isActive);
        }
      };

      toggleSwitch.addEventListener('click', toggleState);

      // بدء السحب (للماوس واللمس)
      const startDrag = (e) => {
        isDragging = true;
        startX = e.touches ? e.touches[0].clientX : e.clientX; // دعم اللمس
        toggleSwitch.style.transition = 'none'; // إزالة الانتقال أثناء السحب
      };

      // أثناء السحب (للماوس واللمس)
      const moveDrag = (e) => {
        if (isDragging) {
          const currentX = e.touches ? e.touches[0].clientX : e.clientX; // دعم اللمس
          const rect = toggleSwitch.getBoundingClientRect();
          const midPoint = rect.left + rect.width / 2;

          if (currentX > midPoint) {
            toggleSwitch.classList.add('active');
          } else {
            toggleSwitch.classList.remove('active');
          }
        }
      };

      // إنهاء السحب (للماوس واللمس)
      const endDrag = () => {
        if (isDragging) {
          isDragging = false;
          toggleSwitch.style.transition = 'background-color 0.3s ease'; // إعادة الانتقال
          const isActive = toggleSwitch.classList.contains('active');
          localStorage.setItem(`toggleState-${index}`, isActive);
        }
      };

      // إضافة أحداث الماوس
      toggleSwitch.addEventListener('mousedown', startDrag);
      document.addEventListener('mousemove', moveDrag);
      document.addEventListener('mouseup', endDrag);

      // إضافة أحداث اللمس
      toggleSwitch.addEventListener('touchstart', startDrag);
      document.addEventListener('touchmove', moveDrag);
      document.addEventListener('touchend', endDrag);
    });
    // ---------------------
  });
  
  
