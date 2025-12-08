interface StoredFile {
  name: string;
  type: string;
  lastModified: number;
  content: string; // base64 data URL
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const base64ToFile = async (dataUrl: string, filename: string, options: { type: string, lastModified: number }): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, options);
};

export const saveFileToStorage = async (key: string, file: File): Promise<void> => {
  try {
    const content = await fileToBase64(file);
    const storedFile: StoredFile = {
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      content,
    };
    localStorage.setItem(key, JSON.stringify(storedFile));
  } catch (error) {
    console.error(`Failed to save file '${key}' to storage:`, error);
  }
};

export const loadFileFromStorage = async (key: string): Promise<File | null> => {
  try {
    const storedFileJSON = localStorage.getItem(key);
    if (!storedFileJSON) {
      return null;
    }
    const storedFile: StoredFile = JSON.parse(storedFileJSON);
    return await base64ToFile(storedFile.content, storedFile.name, {
      type: storedFile.type,
      lastModified: storedFile.lastModified,
    });
  } catch (error) {
    console.error(`Failed to load file '${key}' from storage:`, error);
    // If loading fails, clear the corrupted item
    localStorage.removeItem(key);
    return null;
  }
};

export const removeFileFromStorage = (key: string): void => {
  localStorage.removeItem(key);
};