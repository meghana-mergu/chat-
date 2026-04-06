const DB_NAME = "ChatAppDB";
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB database.
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("contacts")) {
        db.createObjectStore("contacts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("messages")) {
        // Messages can be stored per conversation OR all together.
        // We'll store all together and index by contactId
        const msgStore = db.createObjectStore("messages", { keyPath: "id" });
        msgStore.createIndex("contactId", "contactId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Helper to run a transaction
 */
async function runTransaction(storeName, mode, callback) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    let result;
    try {
      result = callback(store);
    } catch (err) {
      reject(err);
    }

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = (e) => reject(e.target.error);
  });
}

// ======================= Contacts API =======================

export async function saveContactToDB(contact) {
  return runTransaction("contacts", "readwrite", (store) => {
    store.put(contact);
  });
}

export async function getContactsFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("contacts", "readonly");
    const store = transaction.objectStore("contacts");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ======================= Messages API =======================

export async function saveMessageToDB(contactId, message) {
  // Ensure the message object explicitly has contactId attached
  const msgObj = { ...message, contactId };
  return runTransaction("messages", "readwrite", (store) => {
    store.put(msgObj);
  });
}

export async function saveMessagesToDB(contactId, messagesArray) {
  return runTransaction("messages", "readwrite", (store) => {
    messagesArray.forEach(msg => {
       store.put({ ...msg, contactId });
    });
  });
}

export async function getMessagesFromDB(contactId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("messages", "readonly");
    const store = transaction.objectStore("messages");
    const index = store.index("contactId");
    const request = index.getAll(contactId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllMessagesFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("messages", "readonly");
    const store = transaction.objectStore("messages");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e.target.error);
  });
}
