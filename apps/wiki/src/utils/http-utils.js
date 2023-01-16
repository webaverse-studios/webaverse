export const getFormData = o => {
  const formData = new FormData();
  for (const k in o) {
    formData.append(k, o[k]);
  }
  return formData;
};

export function downloadFile(file, filename) {
  const blobURL = URL.createObjectURL(file);
  const tempLink = document.createElement('a');
  tempLink.style.display = 'none';
  tempLink.href = blobURL;
  tempLink.setAttribute('download', filename);

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
}