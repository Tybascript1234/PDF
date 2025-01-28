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
        pdfPreview.innerHTML = ''; // مسح الصفحات السابقة
        pageCountDisplay.textContent = `Page 1 of ${pdf.numPages}`; // عرض عدد الصفحات

        let firstThumbnailSet = false; // متغير لتحديد أول صورة مصغرة
        let pageNumOrder = []; // لتخزين ترتيب الصفحات

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
                    // إنشاء عنصر canvas للصورة المصغرة
                    const thumbnailCanvas = document.createElement('canvas');
                    thumbnailCanvas.classList.add('thumbnail');
                    thumbnailCanvas.id = `thumbnail-${pageNum}`;
                    thumbnailCanvas.width = viewport.width / 4; // تصغير العرض
                    thumbnailCanvas.height = viewport.height / 4; // تصغير الارتفاع
                    thumbnailCanvas.onclick = () => showPage(pageNum);

                    // إذا كانت هذه هي أول صورة مصغرة، أضف التحديد
                    if (!firstThumbnailSet) {
                        thumbnailCanvas.classList.add('selected'); // إضافة التحديد
                        firstThumbnailSet = true;
                    }

                    // رسم الصورة المصغرة على canvas
                    const thumbnailContext = thumbnailCanvas.getContext('2d');
                    thumbnailContext.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

                    // إنشاء div لرقم الصفحة ووضعه أسفل الصورة المصغرة
                    const pageNumDiv = document.createElement('div');
                    pageNumDiv.classList.add('page-number');
                    pageNumDiv.textContent = ` ${pageNum}`;

                    // إضافة الـ canvas للصورة المصغرة إلى الـ div
                    const thumbnailWrapper = document.createElement('div');
                    thumbnailWrapper.classList.add('thumbnail-wrapper');
                    thumbnailWrapper.appendChild(thumbnailCanvas);
                    thumbnailWrapper.appendChild(pageNumDiv);

                    // إضافة الصورة المصغرة مع الرقم إلى thumbnails
                    thumbnails.appendChild(thumbnailWrapper);

                    // إضافة زر نسخ النص إلى الصفحة الكاملة
                    const copyTextButton = document.createElement('button');
                    copyTextButton.innerHTML = '<span class="material-symbols-outlined notranslate">content_copy</span>';
                    copyTextButton.classList.add('copy-text-button');
                    copyTextButton.style.display = 'none'; // إخفاء الزر افتراضيًا
                    copyTextButton.onclick = () => copyTextFromPage(pageNum, copyTextButton);

                    // إضافة الصفحة الكاملة وزر نسخ النص إلى pdfPreview
                    const pageWrapper = document.createElement('div');
                    pageWrapper.classList.add('page-wrapper');
                    pageWrapper.appendChild(canvas);
                    pageWrapper.appendChild(copyTextButton);
                    pdfPreview.appendChild(pageWrapper);

                    // تخزين ترتيب الصفحات
                    pageNumOrder.push(pageNum);

                    // مراقبة التمرير لتحديد العناصر
                    observeScrollSync();

                    // مراقبة الصفحات المرئية
                    observePages();
                });
            });
        }

        // التأكد من ترتيب الصفحات في thumbnails
        reorderThumbnails(pageNumOrder);
    }).catch(error => {
        console.error('Error loading PDF:', error);
    });
}

  // الحصول على الزر الجديد
  const toggleButtons = document.getElementById('toggleButtons');

  // حالة إظهار الأزرار
  let buttonsVisible = true;

  // حدث الضغط على الزر
  toggleButtons.addEventListener('click', () => {
      // الحصول على جميع أزرار نسخ النص
      const copyTextButtons = document.querySelectorAll('.copy-text-button');

      // تبديل حالة الإظهار
      buttonsVisible = !buttonsVisible;

      // إظهار أو إخفاء الأزرار
      copyTextButtons.forEach(button => {
          button.style.display = buttonsVisible ? 'flex' : 'none';
      });

      // تحديث نص الزر
      toggleButtons.textContent = buttonsVisible ? 'إخفاء' : 'إظهار';
  });

// وظيفة نسخ النص من صفحة معينة
async function copyTextFromPage(pageNum, copyTextButton) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const textItems = textContent.items.map(item => item.str);
    const text = textItems.join(' ');

    // تغيير محتوى الزر إلى "تم النسخ"
    copyTextButton.innerHTML = '<span class="material-symbols-outlined good notranslate">done</span>';

    // نسخ النص إلى الحافظة
    navigator.clipboard.writeText(text).then(() => {
        // إعادة محتوى الزر إلى الحالة الأصلية بعد ثانية واحدة
        setTimeout(() => {
            copyTextButton.innerHTML = '<span class="material-symbols-outlined good notranslate">content_copy</span>';
        }, 1000); // 1000 مللي ثانية = 1 ثانية
    }).catch(err => {
        console.error('فشل في نسخ النص:', err);
        alert('فشل في نسخ النص!');
    });
}

// وظيفة لمزامنة ترتيب الصور المصغرة مع الصفحات
function reorderThumbnails(pageNumOrder) {
    const thumbnailsContainer = document.getElementById('thumbnails');
    const allThumbnails = Array.from(thumbnailsContainer.querySelectorAll('.thumbnail-wrapper'));

    // ترتيب الصور المصغرة بناءً على ترتيب الصفحات
    pageNumOrder.forEach((pageNum) => {
        const thumbnailWrapper = allThumbnails.find(wrapper => {
            return wrapper.querySelector('.thumbnail').id === `thumbnail-${pageNum}`;
        });

        if (thumbnailWrapper) {
            thumbnailsContainer.appendChild(thumbnailWrapper);
        }
    });
}

function observeScrollSync() {
    const previewElement = document.getElementById('pdfPreview');
    const thumbnailsElement = document.getElementById('thumbnails');

    let isScrolling;

    previewElement.addEventListener('scroll', () => {
        // إلغاء التأخير السابق إذا كان هناك
        window.cancelAnimationFrame(isScrolling);

        // استخدام requestAnimationFrame لتحسين الأداء
        isScrolling = window.requestAnimationFrame(() => {
            const pages = document.querySelectorAll('.pdf-page');
            let currentPage = 1;

            // تحقق من الصفحة التي تظهر حاليًا
            pages.forEach((page, index) => {
                const rect = page.getBoundingClientRect();
                if (rect.top >= 0 && rect.top < window.innerHeight) {
                    currentPage = index + 1;
                }
            });

            // تحديث التحديد في thumbnails
            document.querySelectorAll('.thumbnail').forEach(thumbnail => {
                thumbnail.classList.remove('selected');
            });

            const currentThumbnail = document.getElementById(`thumbnail-${currentPage}`);
            if (currentThumbnail) {
                currentThumbnail.classList.add('selected');
                currentThumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // التحقق من التمرير إلى أعلى الصفحة في وضع الهاتف
            if (window.innerWidth <= 768 && previewElement.scrollTop === 0) {
                const firstThumbnail = document.getElementById('thumbnail-1');
                if (firstThumbnail) {
                    firstThumbnail.classList.add('selected');
                    firstThumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // إلغاء تحديد أي صورة أخرى عند الوصول إلى أول صفحة
                document.querySelectorAll('.thumbnail').forEach(thumbnail => {
                    if (thumbnail !== firstThumbnail) {
                        thumbnail.classList.remove('selected');
                    }
                });
            }
        });
    });

    // إضافة حدث لمراقبة تغيير التوجيه
    window.addEventListener('orientationchange', () => {
        checkInitialPageInMobile();
    });

    // تأكد من التحديد في وضع الهاتف عند التحميل الأول
    checkInitialPageInMobile();
}

function checkInitialPageInMobile() {
    if (window.innerWidth <= 768) {
        const firstThumbnail = document.getElementById('thumbnail-1');
        if (firstThumbnail) {
            firstThumbnail.classList.add('selected');
            firstThumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}


function checkInitialPageInMobile() {
    const previewElement = document.getElementById('pdfPreview');
    const pages = document.querySelectorAll('.pdf-page');

    if (window.innerWidth <= 768) {
        // تحقق من الصفحة الأولى عند التحميل الأول
        const rect = pages[0].getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            const firstThumbnail = document.getElementById('thumbnail-1');
            if (firstThumbnail) {
                firstThumbnail.classList.add('selected');
                firstThumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}

// وظيفة عرض صفحة معينة
function showPage(pageNum) {
    const pageCanvas = document.getElementById(`page-${pageNum}`);
    if (pageCanvas) {
        pageCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


// مراقبة التمرير لتحديد الصفحة المرئية
function observePages() {
    const pages = document.querySelectorAll('.page-wrapper');
    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                const pageNum = parseInt(entry.target.querySelector('.pdf-page').id.replace('page-', ''), 10);
                if (entry.isIntersecting) {
                    // إظهار زر نسخ النص للصفحة المرئية
                    entry.target.querySelector('.copy-text-button').style.display = 'flex';
                } else {
                    // إخفاء زر نسخ النص للصفحات غير المرئية
                    entry.target.querySelector('.copy-text-button').style.display = 'none';
                }
            });
        },
        {
            root: null, // مراقبة ضمن الإطار الكامل
            threshold: 0.5 // يعتبر الصفحة مرئية إذا كان 50% منها داخل العرض
        }
    );

    pages.forEach(page => observer.observe(page));
}

// التحقق من وضع الهاتف عند تغيير حجم الشاشة
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        const firstPage = document.querySelector('.pdf-page');
        if (firstPage) {
            firstPage.classList.add('selected');
        }
    }
});




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
            page.style.height = 'max-content';
            page.style.margin = '10px 0';
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
let isTwoPagesSideBySide = false;

toggleCheck.addEventListener('click', () => {
    const pageWrappers = document.querySelectorAll('.page-wrapper');

    if (isTwoPagesSideBySide) {
        // العودة إلى الوضع الأصلي
        pageWrappers.forEach((wrapper) => {
            wrapper.style.display = 'block';
            wrapper.style.width = 'max-content';
            wrapper.style.margin = '0';
        });
        checkIcon.style.display = 'none'; // إخفاء أيقونة check
        thumbnails.style.display = 'block'; // إعادة عرض thumbnails
        thumbnails.style.position = 'static'; // إعادة موضع thumbnails إلى الوضع الأصلي
    } else {
        // عرض كل صفحتين بجانب بعض
        pageWrappers.forEach((wrapper) => {
            wrapper.style.display = 'inline-flex';
            wrapper.style.width = 'max-content'; // تعيين عرض الصفحة
            wrapper.style.margin = '5px';
        });
        thumbnails.style.display = 'none';
        thumbnails.style.height = '-webkit-fill-available';
        thumbnails.style.position = 'absolute'; // تغيير موضع 
        checkIcon.style.display = 'inline'; // إظهار أيقونة check
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


// العلامة المائية

let watermarkImage = null; // لتخزين صورة العلامة المائية
let watermarkSize = 100; // حجم العلامة المائية الافتراضي
let watermarkOpacity = 0.2; // شفافية العلامة المائية الافتراضية (من 0 إلى 1)

const watermarkInput = document.getElementById('watermarkInput');
const watermarkSizeSelect = document.getElementById('watermarkSizeSelect');
const watermarkOpacityInput = document.getElementById('watermarkOpacityInput');
const applyWatermarkButton = document.getElementById('applyWatermarkButton');
const removeWatermarkButton = document.getElementById('removeWatermarkButton');

let savedPages = []; // لحفظ المحتوى الأصلي للصفحات

// تحميل صورة العلامة المائية
watermarkInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image')) {
        const reader = new FileReader();
        reader.onload = function() {
            watermarkImage = new Image();
            watermarkImage.src = reader.result;
            watermarkImage.onload = function() {
                // عند تحميل الصورة الجديدة، سيتم استبدال الصورة القديمة
                applyWatermark(); // إعادة تطبيق العلامة المائية مع الصورة الجديدة
            };
        };
        reader.readAsDataURL(file);
    }
});

// تغيير حجم العلامة المائية
watermarkSizeSelect.addEventListener('change', (e) => {
    watermarkSize = parseInt(e.target.value, 10);
});

// تغيير شفافية العلامة المائية
watermarkOpacityInput.addEventListener('input', (e) => {
    watermarkOpacity = e.target.value / 100; // من 1 إلى 100 إلى نطاق 0 إلى 1
});

// حفظ المحتوى الأصلي للصفحات
function savePageContent() {
    const pages = document.querySelectorAll('.pdf-page');
    savedPages = []; // إعادة تعيين المحتوى المحفوظ
    pages.forEach((page) => {
        const canvas = page.getContext('2d');
        const pageWidth = page.width;
        const pageHeight = page.height;
        // حفظ المحتوى في صورة مؤقتة
        const imageData = canvas.getImageData(0, 0, pageWidth, pageHeight);
        savedPages.push(imageData);
    });
}

// تطبيق العلامة المائية
function applyWatermark() {
    if (!watermarkImage) {
        alert('الرجاء تحميل صورة العلامة المائية أولاً.');
        return;
    }

    savePageContent(); // حفظ المحتوى الأصلي قبل إضافة العلامة المائية

    const pages = document.querySelectorAll('.pdf-page');
    pages.forEach((page, index) => {
        const canvas = page.getContext('2d');
        const pageWidth = page.width;
        const pageHeight = page.height;

        // إعادة رسم المحتوى الأصلي
        canvas.putImageData(savedPages[index], 0, 0);

        // إضافة العلامة المائية خلف النص والصور
        canvas.globalAlpha = watermarkOpacity; // ضبط الشفافية
        canvas.drawImage(
            watermarkImage,
            (pageWidth - watermarkSize) / 2, // وضع العلامة في منتصف الصفحة
            (pageHeight - watermarkSize) / 2, // وضع العلامة في منتصف الصفحة
            watermarkSize, // حجم العلامة
            watermarkSize // حجم العلامة
        );
        canvas.globalAlpha = 1; // إعادة الشفافية الافتراضية
    });
}

// إزالة العلامة المائية (إعادة الرسم بدون العلامة المائية)
removeWatermarkButton.addEventListener('click', () => {
    // مسح العلامة المائية من صورة التحميل
    watermarkImage = null;

    // إعادة رسم المحتوى الأصلي للصفحات بدون العلامة المائية
    const pages = document.querySelectorAll('.pdf-page');
    pages.forEach((page, index) => {
        const canvas = page.getContext('2d');
        // إعادة رسم المحتوى الأصلي بدون أي تعديل
        const pageWidth = page.width;
        const pageHeight = page.height;

        // إعادة رسم المحتوى الأصلي لكل صفحة
        canvas.putImageData(savedPages[index], 0, 0);
    });

    alert("تم إزالة العلامة المائية.");
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




  
  




// //   ------------------------
// document.addEventListener("DOMContentLoaded", function () {
//     const responsiveDiv = document.getElementById("responsiveDiv");
//     let touchTimer;

//     // وظيفة لإظهار الديف
//     function showDiv() {
//         responsiveDiv.classList.add("visible");
//     }

//     // وظيفة لإخفاء الديف
//     function hideDiv() {
//         responsiveDiv.classList.remove("visible");
//     }

//     // التحقق من العرض عند تحميل الصفحة
//     function checkScreenWidth() {
//         if (window.innerWidth > 800) {
//             showDiv(); // إظهار الديف
//         } else {
//             hideDiv(); // إخفاء الديف
//         }
//     }

//     // عند تغيير حجم الشاشة
//     window.addEventListener("resize", checkScreenWidth);

//     // عند لمس الشاشة
//     document.addEventListener("touchstart", function (event) {
//         // إذا كان العرض أكبر من 800، لا تفعل شيئًا
//         if (window.innerWidth > 800) {
//             return;
//         }

//         // إذا كان الهدف هو الديف نفسه أو أي عنصر داخله، لا تفعل شيئًا
//         if (responsiveDiv.contains(event.target)) {
//             return;
//         }

//         // إذا كان الديف ظاهراً، قم بإخفائه
//         if (responsiveDiv.classList.contains("visible")) {
//             hideDiv();
//             clearTimeout(touchTimer);
//         } else {
//             // إذا كان الديف مخفياً، انتظر لمدة ثانيتين ثم أظهره
//             touchTimer = setTimeout(showDiv, 1000); // الانتظار لمدة 2 ثانية
//         }
//     });

//     // عند إزالة اللمس
//     document.addEventListener("touchend", function () {
//         clearTimeout(touchTimer); // إلغاء المؤقت إذا تم رفع اللمس قبل انقضاء الوقت
//     });

//     // التحقق من العرض عند التحميل
//     checkScreenWidth();
// });
