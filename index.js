const CLOUDINARY_CLOUD_NAME = 'dtj9o3wu9';
const CLOUDINARY_UPLOAD_PRESET = 'vjukclct';

const form = document.getElementById('enquiryForm');
const submitBtn = document.getElementById('submitBtn');
const successMsg = document.getElementById('successMsg');
const errorMsg = document.getElementById('errorMsg');
const drawingInput = document.getElementById('drawingInput');
const drawingList = document.getElementById('drawingList');
const drawingWarning = document.getElementById('drawingWarning');
const hiddenName = document.getElementById('hiddenName');
const hiddenEmail = document.getElementById('hiddenEmail');
const hiddenCompany = document.getElementById('hiddenCompany');
const hiddenPhone = document.getElementById('hiddenPhone');
const hiddenMessage = document.getElementById('hiddenMessage');

const MAX_DRAWING_FILES = 2;
let selectedDrawingFiles = [];

window.addEventListener('load', () => {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  window.scrollTo(0, 0);
});

function isCloudinaryConfigured() {
  return (
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_UPLOAD_PRESET &&
    CLOUDINARY_CLOUD_NAME !== 'YOUR_CLOUD_NAME' &&
    CLOUDINARY_UPLOAD_PRESET !== 'YOUR_UPLOAD_PRESET'
  );
}

function setErrorMessage(message) {
  errorMsg.textContent = message;
  errorMsg.style.display = 'block';
}

function setDrawingWarning(message) {
  if (!drawingWarning) return;

  if (message) {
    drawingWarning.textContent = message;
    drawingWarning.style.display = 'block';
  } else {
    drawingWarning.textContent = '';
    drawingWarning.style.display = 'none';
  }
}

function syncDrawingInputFiles() {
  if (!drawingInput) return;

  const dataTransfer = new DataTransfer();
  selectedDrawingFiles.forEach((file) => dataTransfer.items.add(file));
  drawingInput.files = dataTransfer.files;
}

function renderDrawingList() {
  if (!drawingList) return;

  if (selectedDrawingFiles.length === 0) {
    drawingList.innerHTML = '<div class="file-list-empty">No drawings selected yet.</div>';
    return;
  }

  drawingList.innerHTML = selectedDrawingFiles
    .map(
      (file, index) => `
        <div class="file-item">
          <span class="file-item-name">${file.name}</span>
          <button type="button" class="file-remove-btn" data-file-index="${index}" aria-label="Remove ${file.name}" title="Remove file">&times;</button>
        </div>
      `
    )
    .join('');
}

function clearSelectedDrawingFiles() {
  selectedDrawingFiles = [];
  syncDrawingInputFiles();
  renderDrawingList();
  setDrawingWarning('');
}

function syncStandardFields() {
  const fullNameInput = form.querySelector('input[name="Full Name"]');
  const emailInput = form.querySelector('input[name="Email"]');
  const companyInput = form.querySelector('input[name="Company Name"]');
  const phoneInput = form.querySelector('input[name="Phone"]');
  const messageInput = form.querySelector('textarea[name="Project Description"]');

  if (hiddenName) hiddenName.value = fullNameInput?.value || '';
  if (hiddenEmail) hiddenEmail.value = emailInput?.value || '';
  if (hiddenCompany) hiddenCompany.value = companyInput?.value || '';
  if (hiddenPhone) hiddenPhone.value = phoneInput?.value || '';
  if (hiddenMessage) hiddenMessage.value = messageInput?.value || '';
}

async function uploadFileToCloudinary(file) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const resourceType = isPdf ? 'image' : 'auto';
  const cloudFormData = new FormData();
  cloudFormData.append('file', file);
  cloudFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: 'POST',
      body: cloudFormData
    }
  );

  const data = await response.json();

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || `Upload failed for ${file.name}`);
  }

  return {
    fileName: file.name,
    resourceType: data.resource_type || resourceType,
    publicId: data.public_id,
    format: data.format,
    url: data.secure_url
  };
}

async function submitFormData(formData) {
  const response = await fetch(form.action, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' }
  });

  let responseData = null;
  try {
    responseData = await response.json();
  } catch (error) {
    responseData = null;
  }

  return { response, responseData };
}

function showSuccess() {
  successMsg.style.display = 'block';
  form.reset();
  clearSelectedDrawingFiles();
  submitBtn.textContent = 'Sent!';
  submitBtn.style.background = '#28a745';

  setTimeout(() => {
    submitBtn.textContent = 'Send Enquiry';
    submitBtn.style.background = '';
    submitBtn.disabled = false;
    successMsg.style.display = 'none';
  }, 5000);
}

function showError(message) {
  setErrorMessage(message || 'Something went wrong. Please try again or email us directly.');
  submitBtn.textContent = 'Send Enquiry';
  submitBtn.style.background = '';
  submitBtn.disabled = false;
}

if (drawingInput) {
  drawingInput.addEventListener('change', () => {
    const newFiles = Array.from(drawingInput.files || []);

    if (newFiles.length === 0) {
      syncDrawingInputFiles();
      return;
    }

    const combinedFiles = [...selectedDrawingFiles, ...newFiles];
    if (combinedFiles.length > MAX_DRAWING_FILES) {
      selectedDrawingFiles = combinedFiles.slice(0, MAX_DRAWING_FILES);
      setDrawingWarning(`You can upload only ${MAX_DRAWING_FILES} documents at a time. If you have more drawings, please reach out to the company email.`);
    } else {
      selectedDrawingFiles = combinedFiles;
      setDrawingWarning('');
    }

    syncDrawingInputFiles();
    renderDrawingList();
  });
}

if (drawingList) {
  drawingList.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.file-remove-btn');
    if (!removeButton) return;

    const fileIndex = Number(removeButton.dataset.fileIndex);
    selectedDrawingFiles = selectedDrawingFiles.filter((_, index) => index !== fileIndex);
    syncDrawingInputFiles();
    renderDrawingList();
    if (selectedDrawingFiles.length < MAX_DRAWING_FILES) {
      setDrawingWarning('');
    }
  });
}

renderDrawingList();

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  submitBtn.textContent = selectedDrawingFiles.length > 0 ? 'Uploading...' : 'Sending...';
  submitBtn.disabled = true;
  submitBtn.style.background = '#888';
  successMsg.style.display = 'none';
  errorMsg.style.display = 'none';

  try {
    syncStandardFields();
    const formData = new FormData(form);

    if (selectedDrawingFiles.length > MAX_DRAWING_FILES) {
      throw new Error(`Please upload only ${MAX_DRAWING_FILES} documents. If you have more drawings, please reach out to the company email.`);
    }

    if (selectedDrawingFiles.length > 0) {
      formData.set(
        'Drawing File Names',
        selectedDrawingFiles.map((file) => file.name).join('\n')
      );

      formData.delete('Drawing');

      if (isCloudinaryConfigured()) {
        const uploadResults = await Promise.allSettled(
          selectedDrawingFiles.map((file) => uploadFileToCloudinary(file))
        );

        const successfulUploads = uploadResults
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value);

        const failedUploads = uploadResults
          .map((result, index) => ({ result, file: selectedDrawingFiles[index] }))
          .filter(({ result }) => result.status === 'rejected')
          .map(({ file }) => file.name);

        if (successfulUploads.length > 0) {
          const documentList = successfulUploads
            .map((item, index) => `${index + 1}. ${item.fileName} - ${item.url}`)
            .join('\n');

          formData.set('Uploaded Documents Count', String(successfulUploads.length));
          formData.set('Uploaded Documents', documentList);
        }

        if (failedUploads.length > 0) {
          formData.set(
            'Drawing Upload Status',
            `Some files failed to upload:\n${failedUploads.join('\n')}`
          );
        }

        if (successfulUploads.length === 0) {
          formData.set(
            'Drawing Upload Status',
            'Cloud upload could not be completed. File names are included instead.'
          );
        }
      } else {
        formData.set(
          'Drawing Upload Status',
          'Cloud links are not configured yet. File names are included instead.'
        );
      }
    }

    const { response, responseData } = await submitFormData(formData);

    if (!response.ok) {
      const message =
        responseData?.errors?.map((item) => item.message).join(', ') ||
        responseData?.error ||
        'Server error';
      throw new Error(message);
    }

    showSuccess();
  } catch (err) {
    console.error('Form error:', err);
    showError(err.message);
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeUp 0.7s ease both';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.service-card, .why-point, .contact-detail').forEach((element) => {
  element.style.opacity = '0';
  observer.observe(element);
});
