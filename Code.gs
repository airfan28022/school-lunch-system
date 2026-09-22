/**
 * =========================================================================
 * ระบบบริหารจัดการอาหารกลางวันโรงเรียน (School Lunch Management System)
 * Google Apps Script Backend (Code.gs)
 * =========================================================================
 * 
 * ความสามารถของสคริปต์นี้:
 * 1. Google Sheets: บันทึกและซิงค์ข้อมูลอัตโนมัติ (Settings, MenuBank, DailyMenu)
 * 2. Google Drive: สร้างโฟลเดอร์อัตโนมัติ จัดเก็บรูปภาพอาหารและโลโก้โรงเรียน พร้อมสร้าง Direct Link
 * 3. REST API Web App: ให้บริการทั้ง HTTP GET และ POST พร้อมจัดการ CORS ในตัว
 * 
 * การตั้งค่า:
 * - PARENT_FOLDER_ID: ระบุ ID โฟลเดอร์ Google Drive หลัก หรือปล่อยว่างไว้ให้ระบบสร้างให้อัตโนมัติ
 * - SPREADSHEET_ID: ถ้าติดตั้งแบบผูกกับ Sheet จะใช้ Sheet นั้นอัตโนมัติ หรือปล่อยว่างให้สร้างไฟล์ใหม่
 */

// โฟลเดอร์หลักสำหรับจัดเก็บไฟล์ (สามารถเปลี่ยนเป็น Folder ID ของท่านได้)
const DEFAULT_PARENT_FOLDER_ID = '13hIUaTSAcZgA_smhKD6PSjuXwkr4ZsiI';

/**
 * -------------------------------------------------------------
 * 1. HTTP GET Web API Handler
 * -------------------------------------------------------------
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || 'getAllData';
    const ss = getOrCreateSpreadsheet();

    let responseData = {};

    switch (action) {
      case 'ping':
        responseData = { 
          status: 'success', 
          message: 'Google Apps Script API พร้อมทำงานอย่างสมบูรณ์', 
          spreadsheetUrl: ss.getUrl(),
          timestamp: new Date().toISOString() 
        };
        break;

      case 'getSettings':
        responseData = { 
          status: 'success', 
          data: getSettingsData(ss) 
        };
        break;

      case 'getMenuBank':
        responseData = { 
          status: 'success', 
          data: getMenuBankData(ss) 
        };
        break;

      case 'getDailyMenu':
        const monthFilter = params.month || '';
        const dateFilter = params.date || '';
        responseData = { 
          status: 'success', 
          data: getDailyMenuData(ss, monthFilter, dateFilter) 
        };
        break;

      case 'getLinks':
        const folder = getOrCreateParentFolder();
        responseData = {
          status: 'success',
          spreadsheetUrl: ss.getUrl(),
          driveFolderUrl: folder.getUrl()
        };
        break;

      case 'getAllData':
      default:
        responseData = {
          status: 'success',
          settings: getSettingsData(ss),
          menuBank: getMenuBankData(ss),
          dailyMenu: getDailyMenuData(ss, params.month || ''),
          spreadsheetUrl: ss.getUrl(),
          timestamp: new Date().toISOString()
        };
        break;
    }

    return createJsonResponse(responseData);
  } catch (error) {
    return createJsonResponse({ 
      status: 'error', 
      message: error.toString(),
      stack: error.stack 
    });
  }
}

/**
 * -------------------------------------------------------------
 * 2. HTTP POST Web API Handler
 * -------------------------------------------------------------
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    const action = payload.action;
    const ss = getOrCreateSpreadsheet();
    let result = {};

    switch (action) {
      case 'saveSettings':
        result = saveSettingsData(ss, payload.data || payload);
        break;

      case 'saveMenuItem':
        result = saveMenuItemData(ss, payload.data || payload);
        break;

      case 'deleteMenuItem':
        result = deleteMenuItemData(ss, payload.id || payload.menuName);
        break;

      case 'saveDailyMenu':
        result = saveDailyMenuData(ss, payload.data || payload);
        break;

      case 'deleteDailyMenu':
        result = deleteDailyMenuData(ss, payload.date);
        break;

      case 'uploadImage':
        result = handleImageUpload(payload);
        break;

      case 'uploadLogo':
        result = handleLogoUploadToDrive(ss, payload);
        break;

      case 'deleteImage':
        result = handleImageDelete(payload.fileId);
        break;

      case 'syncAll':
        result = handleSyncAll(ss, payload);
        break;

      default:
        result = { status: 'error', message: 'ไม่พบคำสั่ง (Unknown action): ' + action };
        break;
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ 
      status: 'error', 
      message: error.toString() 
    });
  }
}

/**
 * ส่งคืน JSON Response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * -------------------------------------------------------------
 * 3. Spreadsheet Management & Sheet Initialization
 * -------------------------------------------------------------
 */
function getOrCreateSpreadsheet() {
  const prop = PropertiesService.getScriptProperties();
  let ssId = prop.getProperty('SPREADSHEET_ID');

  let ss = null;
  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }

    if (!ss) {
      ss = SpreadsheetApp.create('ระบบอาหารกลางวันโรงเรียน_ฐานข้อมูล');
      prop.setProperty('SPREADSHEET_ID', ss.getId());
    }
  }

  // สร้างและจัดโครงสร้างชีตย่อยอัตโนมัติ
  initSheetsStructure(ss);
  return ss;
}

/**
 * สร้างตารางชีตย่อยและใส่ข้อมูลตั้งต้นอัตโนมัติ
 */
function initSheetsStructure(ss) {
  // ชีต 1: Settings
  let sheetSettings = ss.getSheetByName('Settings');
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet('Settings');
    sheetSettings.appendRow(['Key', 'Value', 'LastUpdated']);
    sheetSettings.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f1f5f9');
    
    const defaultSettings = [
      ['schoolName', 'โรงเรียนเทศบาลพัฒนา (ตัวอย่าง)', new Date()],
      ['department', 'สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษา', new Date()],
      ['managerName', 'นางสาวมาลี วงศ์สว่าง (หัวหน้างานโภชนาการ)', new Date()],
      ['directorName', 'นายสมเกียรติ สุขเกษม (ผู้อำนวยการโรงเรียน)', new Date()],
      ['logoUrl', '', new Date()]
    ];
    defaultSettings.forEach(function(row) {
      sheetSettings.appendRow(row);
    });
  }

  // ชีต 2: MenuBank
  let sheetMenuBank = ss.getSheetByName('MenuBank');
  if (!sheetMenuBank) {
    sheetMenuBank = ss.insertSheet('MenuBank');
    sheetMenuBank.appendRow(['ID', 'Category', 'MenuName', 'CreatedAt']);
    sheetMenuBank.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f1f5f9');
    
    const defaultMenus = [
      ['MB01', 'ข้าว', 'ข้าวสวยหอมมะลิ', new Date()],
      ['MB02', 'ข้าว', 'ข้าวกล้องเกษตรอินทรีย์', new Date()],
      ['MB03', 'ข้าว', 'ข้าวไรซ์เบอร์รี่', new Date()],
      ['MB04', 'อาหารจานเดียว', 'ข้าวมันไก่ต้ม พร้อมน้ำซุปฟัก', new Date()],
      ['MB05', 'อาหารจานเดียว', 'ก๋วยเตี๋ยวหมูสับน้ำใส ลูกชิ้นปลา', new Date()],
      ['MB06', 'อาหารจานเดียว', 'ข้าวผัดอเมริกัน น่องไก่ทอด', new Date()],
      ['MB07', 'อาหารจานเดียว', 'ผัดซีอิ๊วหมูนุ่มใส่คะน้าฮ่องกง', new Date()],
      ['MB08', 'อาหารไม่เผ็ด', 'ต้มจืดเต้าหู้หมูสับสาหร่ายวากาเมะ', new Date()],
      ['MB09', 'อาหารไม่เผ็ด', 'ไข่พะโล้หมูสามชั้น เต้าหู้พวง', new Date()],
      ['MB10', 'อาหารไม่เผ็ด', 'ผัดผักรวมมิตรใส่กุ้งสด', new Date()],
      ['MB11', 'อาหารไม่เผ็ด', 'แกงจืดฟักเขียวกระดูกหมูเห็ดหอม', new Date()],
      ['MB12', 'อาหารเผ็ด', 'แกงเขียวหวานไก่ใส่ฟักและมะเขือเปราะ', new Date()],
      ['MB13', 'อาหารเผ็ด', 'ผัดกะเพราหมูสับใบกะเพราบ้าน', new Date()],
      ['MB14', 'อาหารเผ็ด', 'แกงเผ็ดหมูใส่หน่อไม้สด', new Date()],
      ['MB15', 'ผลไม้', 'กล้วยน้ำว้าเกษตรอินทรีย์', new Date()],
      ['MB16', 'ผลไม้', 'แตงโมหวานฉ่ำหั่นชิ้น', new Date()],
      ['MB17', 'ผลไม้', 'สับปะรดภูแลหวานกรอบ', new Date()],
      ['MB18', 'ขนมหวาน', 'บัวลอยเผือกมะพร้าวอ่อนกะทิสด', new Date()],
      ['MB19', 'ขนมหวาน', 'กล้วยบวชชีงาขาวคั่ว', new Date()]
    ];
    defaultMenus.forEach(function(row) {
      sheetMenuBank.appendRow(row);
    });
  }

  // ชีต 3: DailyMenu
  let sheetDaily = ss.getSheetByName('DailyMenu');
  if (!sheetDaily) {
    sheetDaily = ss.insertSheet('DailyMenu');
    sheetDaily.appendRow([
      'Date',          // A: YYYY-MM-DD
      'Rice',          // B: ข้าว
      'SingleDish',    // C: อาหารจานเดียว
      'Spicy',         // D: อาหารเผ็ด
      'NonSpicy',      // E: อาหารไม่เผ็ด
      'Dessert',       // F: ผลไม้-ของหวาน
      'PhotoUrls',     // G: JSON Array ของรูปภาพ [{url, fileId, name}]
      'Note',          // H: หมายเหตุ
      'Department',    // I: สังกัด
      'UpdatedBy',     // J: ผู้แก้ไขล่าสุด
      'LastModified'   // K: วันที่อัปเดต
    ]);
    sheetDaily.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#f1f5f9');
  }
}

/**
 * -------------------------------------------------------------
 * 4. Google Drive Folder & File Management
 * -------------------------------------------------------------
 */
function getOrCreateParentFolder() {
  const prop = PropertiesService.getScriptProperties();
  let folderId = prop.getProperty('PARENT_FOLDER_ID') || DEFAULT_PARENT_FOLDER_ID;

  let folder = null;
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      folder = null;
    }
  }

  if (!folder) {
    // หากเข้าถึงไม่ได้ ให้สร้างโฟลเดอร์หลักใน Drive ของผู้ใช้
    const rootFolders = DriveApp.getRootFolder().getFoldersByName('ระบบอาหารกลางวัน_คลังรูปภาพ');
    if (rootFolders.hasNext()) {
      folder = rootFolders.next();
    } else {
      folder = DriveApp.getRootFolder().createFolder('ระบบอาหารกลางวัน_คลังรูปภาพ');
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    prop.setProperty('PARENT_FOLDER_ID', folder.getId());
  }

  return folder;
}

/**
 * อัปโหลดรูปภาพอาหารกลางวันลง Google Drive
 */
function handleImageUpload(payload) {
  const base64Data = payload.base64 || payload.fileData;
  const fileName = payload.fileName || ('lunch_' + new Date().getTime() + '.jpg');
  const mimeType = payload.mimeType || 'image/jpeg';
  const activityName = payload.activityName || 'ภาพอาหารกลางวัน';
  const dateStr = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  if (!base64Data) {
    return { status: 'error', message: 'ไม่พบข้อมูล Base64 ของไฟล์ภาพ' };
  }

  const parentFolder = getOrCreateParentFolder();

  // สร้างโฟลเดอร์ตามกิจกรรมและวันที่: [ชื่อกิจกรรม]_[YYYY-MM-DD]
  const targetFolderName = activityName + '_' + dateStr;
  let targetFolder;
  const subFolders = parentFolder.getFoldersByName(targetFolderName);
  if (subFolders.hasNext()) {
    targetFolder = subFolders.next();
  } else {
    targetFolder = parentFolder.createFolder(targetFolderName);
    targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  // แปลง base64 เป็น Blob
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const decoded = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decoded, mimeType, fileName);

  const file = targetFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  // ลิงก์ Direct Link ที่โหลดรูปเร็วและไม่มีหน้าต่างกั้น
  const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

  return {
    status: 'success',
    message: 'อัปโหลดภาพลง Google Drive สำเร็จ',
    fileId: fileId,
    directUrl: directUrl,
    url: directUrl,
    downloadUrl: file.getDownloadUrl(),
    viewUrl: file.getUrl(),
    fileName: fileName,
    folderName: targetFolderName,
    uploadedAt: new Date().toISOString()
  };
}

/**
 * อัปโหลดโลโก้โรงเรียนลง Google Drive และบันทึกในชีต Settings
 */
function handleLogoUploadToDrive(ss, payload) {
  const base64Data = payload.base64 || payload.fileData;
  const fileName = payload.fileName || ('school_logo_' + new Date().getTime() + '.png');
  const mimeType = payload.mimeType || 'image/png';

  if (!base64Data) {
    return { status: 'error', message: 'ไม่พบข้อมูลไฟล์ภาพโลโก้' };
  }

  const parentFolder = getOrCreateParentFolder();
  let logoFolder;
  const subFolders = parentFolder.getFoldersByName('SchoolLogo');
  if (subFolders.hasNext()) {
    logoFolder = subFolders.next();
  } else {
    logoFolder = parentFolder.createFolder('SchoolLogo');
    logoFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const decoded = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decoded, mimeType, fileName);

  const file = logoFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

  // บันทึกลง Settings Sheet ทันที
  saveSettingsData(ss, { logoUrl: directUrl });

  return {
    status: 'success',
    message: 'บันทึกโลโก้โรงเรียนลง Google Drive และชีต Settings เรียบร้อยแล้ว',
    fileId: fileId,
    logoUrl: directUrl,
    directUrl: directUrl
  };
}

/**
 * ลบรูปภาพจาก Drive
 */
function handleImageDelete(fileId) {
  if (!fileId) {
    return { status: 'error', message: 'ไม่พบ File ID' };
  }
  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return { status: 'success', message: 'ลบไฟล์รูปภาพออกจาก Drive แล้ว' };
  } catch (err) {
    return { status: 'error', message: 'ไม่สามารถลบไฟล์ได้: ' + err.toString() };
  }
}

/**
 * -------------------------------------------------------------
 * 5. Data Query & Mutation Operations
 * -------------------------------------------------------------
 */

function getSettingsData(ss) {
  const sheet = ss.getSheetByName('Settings');
  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < values.length; i++) {
    const key = values[i][0];
    const val = values[i][1];
    if (key) {
      settings[key] = val;
    }
  }
  return settings;
}

function getMenuBankData(ss) {
  const sheet = ss.getSheetByName('MenuBank');
  const values = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i][2]) {
      list.push({
        id: values[i][0] || ('MB' + i),
        category: values[i][1] || 'อาหารไม่เผ็ด',
        menuName: values[i][2],
        createdAt: values[i][3] || ''
      });
    }
  }
  return list;
}

function getDailyMenuData(ss, monthFilter, dateFilter) {
  const sheet = ss.getSheetByName('DailyMenu');
  const values = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const dateVal = row[0];
    if (!dateVal) continue;

    let dateStr = '';
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(dateVal).trim();
    }

    if (monthFilter && !dateStr.startsWith(monthFilter)) continue;
    if (dateFilter && dateStr !== dateFilter) continue;

    let photos = [];
    try {
      if (row[6]) photos = JSON.parse(row[6]);
    } catch (e) {
      if (row[6]) photos = [{ url: String(row[6]), name: 'photo' }];
    }

    list.push({
      date: dateStr,
      rice: row[1] || '',
      singleDish: row[2] || '',
      spicy: row[3] || '',
      nonSpicy: row[4] || '',
      dessert: row[5] || '',
      photos: photos,
      note: row[7] || '',
      department: row[8] || '',
      updatedBy: row[9] || '',
      lastModified: row[10] || ''
    });
  }

  list.sort(function(a, b) {
    return a.date.localeCompare(b.date);
  });

  return list;
}

function saveSettingsData(ss, data) {
  const sheet = ss.getSheetByName('Settings');
  const values = sheet.getDataRange().getValues();
  const now = new Date();

  for (const key in data) {
    let found = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === key) {
        sheet.getRange(i + 1, 2, 1, 2).setValues([[data[key], now]]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, data[key], now]);
    }
  }

  return { status: 'success', message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' };
}

function saveMenuItemData(ss, item) {
  const sheet = ss.getSheetByName('MenuBank');
  const values = sheet.getDataRange().getValues();
  const now = new Date();
  const id = item.id || ('MB' + new Date().getTime());

  let rowToUpdate = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == id || (values[i][2] == item.menuName && values[i][1] == item.category)) {
      rowToUpdate = i + 1;
      break;
    }
  }

  if (rowToUpdate > 0) {
    sheet.getRange(rowToUpdate, 2, 1, 2).setValues([[item.category, item.menuName]]);
  } else {
    sheet.appendRow([id, item.category, item.menuName, now]);
  }

  return { status: 'success', message: 'บันทึกรายการในคลังเมนูเรียบร้อยแล้ว', id: id };
}

function deleteMenuItemData(ss, idOrName) {
  const sheet = ss.getSheetByName('MenuBank');
  const values = sheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][0] == idOrName || values[i][2] == idOrName) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'ลบรายการเมนูเรียบร้อยแล้ว' };
    }
  }
  return { status: 'error', message: 'ไม่พบรายการที่ต้องการลบ' };
}

function saveDailyMenuData(ss, data) {
  const sheet = ss.getSheetByName('DailyMenu');
  const values = sheet.getDataRange().getValues();
  const now = new Date();

  const targetDate = data.date;
  if (!targetDate) {
    return { status: 'error', message: 'โปรดระบุวันที่' };
  }

  let rowToUpdate = -1;
  for (let i = 1; i < values.length; i++) {
    const rowDate = values[i][0] instanceof Date 
      ? Utilities.formatDate(values[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(values[i][0]).trim();
    if (rowDate === targetDate) {
      rowToUpdate = i + 1;
      break;
    }
  }

  const photosJson = JSON.stringify(data.photos || []);

  const rowData = [
    targetDate,
    data.rice || '',
    data.singleDish || '',
    data.spicy || '',
    data.nonSpicy || '',
    data.dessert || '',
    photosJson,
    data.note || '',
    data.department || '',
    data.updatedBy || 'ผู้จัดการระบบ',
    now
  ];

  if (rowToUpdate > 0) {
    sheet.getRange(rowToUpdate, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { status: 'success', message: 'บันทึกเมนูประจำวันเรียบร้อยแล้ว', date: targetDate };
}

function deleteDailyMenuData(ss, dateStr) {
  const sheet = ss.getSheetByName('DailyMenu');
  const values = sheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {
    const rowDate = values[i][0] instanceof Date 
      ? Utilities.formatDate(values[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(values[i][0]).trim();
    if (rowDate === dateStr) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'ลบข้อมูลเมนูวันที่ ' + dateStr + ' เรียบร้อยแล้ว' };
    }
  }
  return { status: 'error', message: 'ไม่พบรายการเมนูวันที่ ' + dateStr };
}

function handleSyncAll(ss, payload) {
  if (payload.settings) saveSettingsData(ss, payload.settings);
  if (payload.menuBank && Array.isArray(payload.menuBank)) {
    payload.menuBank.forEach(item => saveMenuItemData(ss, item));
  }
  if (payload.dailyMenus && Array.isArray(payload.dailyMenus)) {
    payload.dailyMenus.forEach(item => saveDailyMenuData(ss, item));
  }
  return { status: 'success', message: 'ซิงค์ข้อมูลทั้งหมดลง Google Sheets เรียบร้อยแล้ว' };
}
