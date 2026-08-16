const DB_NAME = "trendre-link-anonymous-drafts";
const STORE = "images";

type StoredImage = {
  id: string;
  bytes?: ArrayBuffer;
  blob?: Blob;
  name: string;
  type: string;
  updatedAt: number;
};

function imageStorageError(code: string, cause?: unknown) {
  const error = new Error(code);
  if (cause !== undefined) error.cause = cause;
  return error;
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(imageStorageError("anonymous_image_read_failed"));
    };
    reader.onerror = () => reject(reader.error ?? imageStorageError("anonymous_image_read_failed"));
    reader.onabort = () => reject(imageStorageError("anonymous_image_read_aborted"));
    reader.readAsArrayBuffer(blob);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(imageStorageError("indexeddb_unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? imageStorageError("indexeddb_open_failed"));
    request.onblocked = () => reject(imageStorageError("indexeddb_open_blocked"));
  });
}

export async function saveAnonymousDraftImage(id: string, file: Blob, name = "image") {
  const bytes = await blobToArrayBuffer(file);
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const request = tx.objectStore(STORE).put({
        id,
        bytes,
        name,
        type: file.type || "image/jpeg",
        updatedAt: Date.now(),
      } satisfies StoredImage);
      request.onerror = () => reject(request.error ?? imageStorageError("anonymous_image_put_failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? imageStorageError("anonymous_image_transaction_failed"));
      tx.onabort = () => reject(tx.error ?? imageStorageError("anonymous_image_transaction_aborted"));
    });
  } finally {
    db.close();
  }
}

export async function loadAnonymousDraftImage(id: string): Promise<File | null> {
  const db = await openDatabase();
  try {
    const value = await new Promise<StoredImage | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result as StoredImage | undefined);
      request.onerror = () => reject(request.error ?? imageStorageError("anonymous_image_get_failed"));
      tx.onabort = () => reject(tx.error ?? imageStorageError("anonymous_image_transaction_aborted"));
    });
    if (!value) return null;
    const content = value.bytes ?? value.blob;
    return content ? new File([content], value.name, { type: value.type || "image/jpeg" }) : null;
  } finally {
    db.close();
  }
}

export async function deleteAnonymousDraftImage(id: string | null) {
  if (!id) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const request = tx.objectStore(STORE).delete(id);
      request.onerror = () => reject(request.error ?? imageStorageError("anonymous_image_delete_failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? imageStorageError("anonymous_image_transaction_failed"));
      tx.onabort = () => reject(tx.error ?? imageStorageError("anonymous_image_transaction_aborted"));
    });
  } finally {
    db.close();
  }
}
