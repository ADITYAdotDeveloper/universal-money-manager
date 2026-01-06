/**
 * MONEY MANAGER BACKEND - GOOGLE APPS SCRIPT
 * 
 * INSTRUCTIONS:
 * 1. Paste this code into Extensions > Apps Script in your Google Sheet.
 * 2. Click 'Deploy' > 'New Deployment'.
 * 3. Select Type: 'Web App'.
 * 4. Description: 'v2'.
 * 5. Execute as: 'Me'.
 * 6. Who has access: 'Anyone' (Important!).
 * 7. Copy the Web App URL and paste it into your frontend code.
 */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Transactions Sheet
  let transSheet = ss.getSheetByName("Transactions");
  if (!transSheet) {
    transSheet = ss.insertSheet("Transactions");
    // Headers: ID, Date, Amount, Type, Category, Note, DebtSubtype, IsRepayment
    transSheet.appendRow(["ID", "Date", "Amount", "Type", "Category", "Note", "DebtSubtype", "IsRepayment"]);
    transSheet.setFrozenRows(1);
  }

  // 2. Setup Categories Sheet
  let catSheet = ss.getSheetByName("Categories");
  if (!catSheet) {
    catSheet = ss.insertSheet("Categories");
    // Headers matching the CategoryMap keys
    catSheet.appendRow(["INCOME", "EXPENSE", "DONATION", "DEBT"]);
    catSheet.setFrozenRows(1);
    
    // Add some defaults
    catSheet.getRange(2, 1).setValue("Allowance");
    catSheet.getRange(2, 2).setValue("Food");
    catSheet.getRange(3, 2).setValue("Transport");
    catSheet.getRange(2, 3).setValue("Charity");
    catSheet.getRange(2, 4).setValue("Good Debt");
    catSheet.getRange(3, 4).setValue("Bad Debt");
  }
}

/**
 * Handle GET requests
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * Handle POST requests
 */
function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  // Wait for up to 10 seconds for other processes to finish.
  lock.tryLock(10000);

  try {
    // SELF-HEALING: Always ensure sheets exist before processing
    // This fixes issues where the user forgot to run 'setup()' manually.
    setup();

    const action = e.parameter.action;
    
    // --- ACTION: GET ---
    if (action === 'get') {
      const data = getAllData();
      return createJSONOutput({ status: 'success', ...data });
    }
    
    // --- ACTION: SAVE (Create or Update) ---
    if (action === 'save') {
      const body = JSON.parse(e.postData.contents);
      saveTransaction(body);
      return createJSONOutput({ status: 'success' });
    }
    
    // --- ACTION: DELETE ---
    if (action === 'delete') {
      const id = e.parameter.id;
      deleteTransaction(id);
      return createJSONOutput({ status: 'success' });
    }

    // --- ACTION: ADD CATEGORY ---
    if (action === 'addCategory') {
      const body = JSON.parse(e.postData.contents);
      addCategory(body.type, body.name);
      return createJSONOutput({ status: 'success' });
    }

    return createJSONOutput({ status: 'error', message: 'Unknown action' });

  } catch (err) {
    return createJSONOutput({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reads all data from Sheets
 */
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Transactions
  const tSheet = ss.getSheetByName("Transactions");
  const tData = tSheet.getDataRange().getValues();
  const transactions = [];
  
  // Skip header row
  for (let i = 1; i < tData.length; i++) {
    const row = tData[i];
    // Ensure we don't pick up empty rows
    if (row[0]) {
      transactions.push({
        id: String(row[0]),
        // Ensure Date is stringified if it's a Date object
        date: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
        amount: Number(row[2]),
        type: row[3],
        category: row[4],
        note: row[5],
        debtSubtype: row[6],
        isRepayment: row[7] === true || String(row[7]).toLowerCase() === 'true'
      });
    }
  }

  // 2. Get Categories
  const cSheet = ss.getSheetByName("Categories");
  const cData = cSheet.getDataRange().getValues();
  const categories = {
    INCOME: [],
    EXPENSE: [],
    DONATION: [],
    DEBT: []
  };

  // Map column index to key
  // 0: INCOME, 1: EXPENSE, 2: DONATION, 3: DEBT
  const keys = ["INCOME", "EXPENSE", "DONATION", "DEBT"];
  
  // Iterate columns
  for (let col = 0; col < 4; col++) {
    const key = keys[col];
    // Iterate rows, skip header (row 0)
    for (let row = 1; row < cData.length; row++) {
      const val = cData[row][col];
      if (val && String(val).trim() !== "") {
        categories[key].push(val);
      }
    }
  }

  return { transactions, categories };
}

/**
 * Saves a transaction (Insert or Update)
 */
function saveTransaction(t) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transactions");
  const data = sheet.getDataRange().getValues();
  
  let rowIndex = -1;
  
  // Look for existing ID to update
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(t.id)) {
      rowIndex = i + 1; // Convert 0-based array index to 1-based Sheet row
      break;
    }
  }

  const rowData = [
    t.id, 
    t.date, 
    Number(t.amount), 
    t.type, 
    t.category, 
    t.note || '', 
    t.debtSubtype || '', 
    t.isRepayment
  ];

  if (rowIndex > 0) {
    // Update existing
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Append new
    sheet.appendRow(rowData);
  }
}

/**
 * Deletes a transaction by ID
 */
function deleteTransaction(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transactions");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

/**
 * Adds a new category if it doesn't exist
 */
function addCategory(type, name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Categories");
  
  const colMap = { "INCOME": 1, "EXPENSE": 2, "DONATION": 3, "DEBT": 4 };
  const colIndex = colMap[type];
  if (!colIndex) return;

  const lastRow = sheet.getLastRow();
  // If sheet is empty (only header), logic handles it.
  
  const allData = sheet.getRange(1, colIndex, Math.max(lastRow, 1), 1).getValues();
  let lastRowInCol = 0;
  
  // Check duplicates and find last filled cell in this specific column
  for (let i = 0; i < allData.length; i++) {
    const val = allData[i][0];
    if (val === name) return; // Already exists
    if (val && String(val).trim() !== "") {
      lastRowInCol = i + 1;
    }
  }

  sheet.getRange(lastRowInCol + 1, colIndex).setValue(name);
}

/**
 * Helper to return JSON response
 */
function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}