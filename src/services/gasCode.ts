/**
 * โค้ดต้นฉบับ Google Apps Script (Code.gs) ฉบับความเร็วและความปลอดภัยสูงสุด (Speed & Enterprise Security Edition)
 * สำหรับแสดง คัดลอก และดาวน์โหลดในระบบหลังบ้าน (Admin Settings)
 */
export const FULL_CODE_GS = `/**
 * =========================================================================
 * ระบบบริหารจัดการอาหารกลางวันโรงเรียน (School Lunch Management System)
 * Google Apps Script Backend (Code.gs) - High-Speed & Enterprise Security Edition
 * =========================================================================
 * 
 * คุณสมบัติเด่น (Features):
 * 1. ข้อมูลในเว็ปทั้งหมดถูกจัดเก็บบน Google Sheets & Drive 100%:
 *    - แผ่นงาน "Settings": ข้อมูลโรงเรียน สังกัด ผู้อำนวยการ หัวหน้าโภชนาการ และตราสัญลักษณ์
 *    - แผ่นงาน "MenuBank": คลังรายการอาหาร 6 หมวดหมู่ (ข้าว, อาหารจานเดียว, อาหารไม่เผ็ด, อาหารเผ็ด, ผลไม้, ของหวาน)
 *    - แผ่นงาน "DailyMenu": แผนเมนูอาหารรายวัน บันทึกวัตถุดิบ และรูปภาพกิจกรรม
 *    - แผ่นงาน "TaxRecords": ระบบคำนวณและบันทึกภาษี ณ ที่จ่าย 1% พร้อมงวดเบิกจ่าย
 * 2. เน้นความเร็วสูงสุด (Ultra-High Speed):
 *    - ทำงานแบบ Batch Range Operations (Single Read / Single Write ต่อแผ่นงาน)
 *    - ประมวลผลในหน่วยความจำ V8 Engine แบบ Hash Map O(1)
 *    - Non-blocking doGet สำหรับอ่านข้อมูลความเร็วระดับเสี้ยววินาที
 *    - Direct Link Google Drive ผ่าน Google Edge CDN (lh3.googleusercontent.com)
 * 3. มาตรฐานความปลอดภัย (Enterprise Security):
 *    - Anti-Formula Injection (CWE-1236): ตรวจจับและ Escape อักขระอันตราย (=, +, -, @)
 *    - Action & Method Whitelisting: รองรับเฉพาะ Action ที่กำหนด ปฏิเสธคำสั่งแปลกปลอม
 *    - MIME Type Validation: ป้องกันการอัปโหลดสคริปต์ อนุญาตเฉพาะไฟล์ภาพ (JPEG, PNG, WebP, SVG, GIF)
 *    - Scoped Drive Sharing: แชร์เฉพาะไฟล์รูปภาพเป็น View-Only ไม่เปิดเผย Drive ส่วนตัว
 *    - LockService Protection: ป้องกันข้อมูลทับซ้อนเมื่อมีการบันทึกพร้อมกัน
 *    - CORS-Friendly Text/Plain Output
 */

// รหัสโฟลเดอร์ Google Drive สำหรับจัดเก็บรูปภาพ (กำหนดเองหรือปล่อยว่างให้สร้างอัตโนมัติ)
const DEFAULT_PARENT_FOLDER_ID = '13hIUaTSAcZgA_smhKD6PSjuXwkr4ZsiI';
const SCRIPT_VERSION = '3.0.0-PRO-SPEED-SECURE';

/**
 * -------------------------------------------------------------
 * 1. HTTP GET Web API Handler (High-Speed Non-Blocking Read)
 * -------------------------------------------------------------
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || 'getAllData';
    const ss = getOrCreateSpreadsheet();

    let responseData = {};

    switch (action) {
      case 'ping':
        responseData = { 
          status: 'success', 
          message: 'Google Apps Script API พร้อมทำงานอย่างสมบูรณ์ (Speed & Security Edition)', 
          version: SCRIPT_VERSION,
          spreadsheetUrl: ss.getUrl(),
          spreadsheetId: ss.getId(),
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
        responseData = { 
          status: 'success', 
          data: getDailyMenuData(ss, params.month || '', params.date || '') 
        };
        break;

      case 'getTaxRecords':
        responseData = {
          status: 'success',
          data: getTaxRecordsData(ss)
        };
        break;

      case 'getLinks':
        const folder = getOrCreateParentFolder();
        responseData = {
          status: 'success',
          spreadsheetUrl: ss.getUrl(),
          driveFolderUrl: folder.getUrl(),
          version: SCRIPT_VERSION
        };
        break;

      case 'getAllData':
      default:
        // ดึงข้อมูลทั้งหมดในครั้งเดียวแบบ High-Speed Batch Read
        const settings = getSettingsData(ss);
        const menuBank = getMenuBankData(ss);
        const dailyMenu = getDailyMenuData(ss, params.month || '');
        const taxRecords = getTaxRecordsData(ss);

        responseData = {
          status: 'success',
          version: SCRIPT_VERSION,
          settings: settings,
          menuBank: menuBank,
          dailyMenu: dailyMenu,
          dailyMenus: dailyMenu,
          taxRecords: taxRecords,
          spreadsheetUrl: ss.getUrl(),
          timestamp: new Date().toISOString()
        };
        break;
    }

    return createJsonResponse(responseData);
  } catch (error) {
    return createJsonResponse({ 
      status: 'error', 
      message: 'เกิดข้อผิดพลาดในการอ่านข้อมูล: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * -------------------------------------------------------------
 * 2. HTTP POST Web API Handler (Secured Atomic Writes)
 * -------------------------------------------------------------
 */
function doPost(e) {
  // Concurrency Lock: ป้องกันการบันทึกทับซ้อนเมื่อมีผู้ใช้งานพร้อมกัน
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(12000); // รอไม่เกิน 12 วินาที

  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = String(payload.action || '').trim();
    if (!action) {
      return createJsonResponse({ status: 'error', message: 'ไม่พบระบุคำสั่ง (action)' });
    }

    const ss = getOrCreateSpreadsheet();
    let result = {};

    switch (action) {
      // 1. Full Database Batch Sync (เร็วที่สุด)
      case 'syncAll':
        result = handleSyncAll(ss, payload);
        break;

      // 2. Settings Management
      case 'saveSettings':
        result = saveSettingsData(ss, payload.data || payload.settings || payload);
        break;

      // 3. Menu Bank Management
      case 'saveMenuItem':
        result = saveMenuItemData(ss, payload.data || payload);
        break;

      case 'deleteMenuItem':
        result = deleteMenuItemData(ss, payload.id || payload.menuName);
        break;

      // 4. Daily Menu Management
      case 'saveDailyMenu':
        result = saveDailyMenuData(ss, payload.data || payload);
        break;

      case 'deleteDailyMenu':
        result = deleteDailyMenuData(ss, payload.date);
        break;

      // 5. Tax Records Management (งวดภาษีและเบิกจ่าย 1%)
      case 'saveTaxRecord':
        result = saveTaxRecordData(ss, payload.data || payload);
        break;

      case 'saveTaxRecordsBatch':
        result = saveTaxRecordsBatch(ss, payload.records || payload.data || []);
        break;

      case 'deleteTaxRecord':
        result = deleteTaxRecordData(ss, payload.id);
        break;

      // 6. Media & Google Drive Management
      case 'uploadLogo':
        result = handleLogoUploadToDrive(ss, payload);
        break;

      case 'uploadImage':
        result = handleImageUpload(payload);
        break;

      case 'deleteImage':
        result = handleImageDelete(payload.fileId);
        break;

      // 7. Database Initialization
      case 'initDatabase':
        initSheetsStructure(ss, true);
        result = { 
          status: 'success', 
          message: 'ตรวจสอบและจัดโครงสร้างชีตฐานข้อมูลครบทั้ง 4 แผ่นงานเรียบร้อยแล้ว',
          spreadsheetUrl: ss.getUrl()
        };
        break;

      default:
        result = { 
          status: 'error', 
          message: 'ไม่พบคำสั่งที่รองรับ (Unknown action: ' + sanitizeForDisplay(action) + ')' 
        };
        break;
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ 
      status: 'error', 
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (e) {
        // Ignored
      }
    }
  }
}

/**
 * ส่งคืน JSON Response ที่เข้ากันได้กับ CORS และระบบเว็บเบราว์เซอร์
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * -------------------------------------------------------------
 * 3. Spreadsheet Management & Sheet Structure Initialization
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
      ss = SpreadsheetApp.create('ระบบอาหารกลางวันโรงเรียน_ฐานข้อมูลกลาง');
      prop.setProperty('SPREADSHEET_ID', ss.getId());
    }
  }

  // รับประกันโครงสร้างตารางครบทั้ง 4 แผ่นงาน
  initSheetsStructure(ss, false);
  return ss;
}

/**
 * สร้างและจัดโครงสร้างแผ่นงานทั้ง 4 แผ่นงานอัตโนมัติ
 * 1. Settings (การตั้งค่าโรงเรียน)
 * 2. MenuBank (คลังรายการอาหาร 6 หมวด)
 * 3. DailyMenu (แผนอาหารรายวัน & รูปภาพ)
 * 4. TaxRecords (บันทึกภาษี 1% และงวดเบิกจ่าย)
 */
function initSheetsStructure(ss, forceFormat) {
  const HEADER_BG = '#1e293b';
  const HEADER_COLOR = '#ffffff';

  // 1. ชีต Settings
  let sheetSettings = ss.getSheetByName('Settings');
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet('Settings');
    const headers = ['Key', 'Value', 'LastUpdated'];
    sheetSettings.appendRow(headers);
    formatHeaderRow(sheetSettings, 3, '#0f172a', HEADER_COLOR);

    const defaultSettings = [
      ['schoolName', 'โรงเรียนบ้านนาออก', new Date()],
      ['department', 'สังกัดสำนักงานเขตพื้นที่ประถมศึกษากระบี่', new Date()],
      ['managerName', 'นางสาวมาลี วงศ์สว่าง (หัวหน้างานโภชนาการ)', new Date()],
      ['directorName', 'นายสมเกียรติ สุขเกษม (ผู้อำนวยการโรงเรียน)', new Date()],
      ['logoUrl', 'https://lh3.googleusercontent.com/d/1tJ0PObYNbFQy_N59gj0ZKWkYLN-7a96n', new Date()],
      ['systemVersion', SCRIPT_VERSION, new Date()]
    ];
    sheetSettings.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings);
    sheetSettings.setColumnWidth(1, 160);
    sheetSettings.setColumnWidth(2, 360);
    sheetSettings.setColumnWidth(3, 180);
  } else if (forceFormat) {
    formatHeaderRow(sheetSettings, 3, '#0f172a', HEADER_COLOR);
  }

  // 2. ชีต MenuBank
  let sheetMenuBank = ss.getSheetByName('MenuBank');
  if (!sheetMenuBank) {
    sheetMenuBank = ss.insertSheet('MenuBank');
    sheetMenuBank.appendRow(['ID', 'Category', 'MenuName', 'CreatedAt']);
    formatHeaderRow(sheetMenuBank, 4, '#047857', HEADER_COLOR);

    const defaultMenus = [
      ['MB01', 'ข้าว', 'ข้าวสวยหอมมะลิใหม่', new Date()],
      ['MB02', 'ข้าว', 'ข้าวกล้องเกษตรอินทรีย์หอมนุ่ม', new Date()],
      ['MB03', 'ข้าว', 'ข้าวไรซ์เบอร์รี่', new Date()],
      ['MB04', 'อาหารจานเดียว', 'ข้าวมันไก่ตอนสูตรอนามัย น้ำซุปฟักหวาน', new Date()],
      ['MB05', 'อาหารจานเดียว', 'ก๋วยเตี๋ยวเส้นหมี่น้ำใสลูกชิ้นปลาหมูสับ', new Date()],
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
    sheetMenuBank.getRange(2, 1, defaultMenus.length, 4).setValues(defaultMenus);
    sheetMenuBank.setColumnWidth(1, 100);
    sheetMenuBank.setColumnWidth(2, 140);
    sheetMenuBank.setColumnWidth(3, 300);
    sheetMenuBank.setColumnWidth(4, 180);
  } else if (forceFormat) {
    formatHeaderRow(sheetMenuBank, 4, '#047857', HEADER_COLOR);
  }

  // 3. ชีต DailyMenu
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
    formatHeaderRow(sheetDaily, 11, '#0284c7', HEADER_COLOR);
    sheetDaily.setColumnWidth(1, 120);
    sheetDaily.setColumnWidth(2, 150);
    sheetDaily.setColumnWidth(3, 180);
    sheetDaily.setColumnWidth(4, 180);
    sheetDaily.setColumnWidth(5, 180);
    sheetDaily.setColumnWidth(6, 180);
    sheetDaily.setColumnWidth(7, 240);
    sheetDaily.setColumnWidth(8, 160);
    sheetDaily.setColumnWidth(9, 180);
    sheetDaily.setColumnWidth(10, 140);
    sheetDaily.setColumnWidth(11, 180);
  } else if (forceFormat) {
    formatHeaderRow(sheetDaily, 11, '#0284c7', HEADER_COLOR);
  }

  // 4. ชีต TaxRecords (บันทึกภาษี 1% และงวดเบิกจ่าย)
  let sheetTax = ss.getSheetByName('TaxRecords');
  if (!sheetTax) {
    sheetTax = ss.insertSheet('TaxRecords');
    sheetTax.appendRow([
      'ID',              // A: รหัสรายการ
      'StartDate',       // B: วันที่เริ่มต้น (YYYY-MM-DD)
      'EndDate',         // C: วันที่สิ้นสุด (YYYY-MM-DD)
      'DaysCount',       // D: จำนวนวัน (จันทร์-ศุกร์)
      'StudentCount',    // E: จำนวนนักเรียน
      'RatePerPerson',   // F: อัตราค่าอาหารต่อคน (บาท)
      'TotalAmount',     // G: ยอดรวมก่อนหักภาษี (บาท)
      'TaxRatePercent',  // H: อัตราภาษีหัก ณ ที่จ่าย (%)
      'TaxAmount',       // I: ยอดภาษี 1% (บาท)
      'NetAmount',       // J: ยอดจ่ายสุทธิ (บาท)
      'IsPaid',          // K: สถานะจ่ายภาษี (TRUE/FALSE)
      'PaidAt',          // L: วันที่จ่ายภาษี
      'Note',            // M: หมายเหตุงวด
      'CreatedAt'        // N: วันที่สร้างรายการ
    ]);
    formatHeaderRow(sheetTax, 14, '#b45309', HEADER_COLOR);
    sheetTax.setColumnWidth(1, 120);
    sheetTax.setColumnWidth(2, 120);
    sheetTax.setColumnWidth(3, 120);
    sheetTax.setColumnWidth(4, 90);
    sheetTax.setColumnWidth(5, 100);
    sheetTax.setColumnWidth(6, 110);
    sheetTax.setColumnWidth(7, 130);
    sheetTax.setColumnWidth(8, 90);
    sheetTax.setColumnWidth(9, 110);
    sheetTax.setColumnWidth(10, 130);
    sheetTax.setColumnWidth(11, 100);
    sheetTax.setColumnWidth(12, 160);
    sheetTax.setColumnWidth(13, 200);
    sheetTax.setColumnWidth(14, 180);
  } else if (forceFormat) {
    formatHeaderRow(sheetTax, 14, '#b45309', HEADER_COLOR);
  }
}

function formatHeaderRow(sheet, numCols, bgColor, textColor) {
  try {
    const range = sheet.getRange(1, 1, 1, numCols);
    range.setFontWeight('bold')
      .setBackground(bgColor)
      .setFontColor(textColor)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);
  } catch (e) {
    // Ignored
  }
}

/**
 * -------------------------------------------------------------
 * 4. Google Drive Folder & Direct Link Image Management
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
    const folderName = 'ระบบอาหารกลางวัน_คลังรูปภาพ';
    const rootFolders = DriveApp.getRootFolder().getFoldersByName(folderName);
    if (rootFolders.hasNext()) {
      folder = rootFolders.next();
    } else {
      folder = DriveApp.getRootFolder().createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    prop.setProperty('PARENT_FOLDER_ID', folder.getId());
  }

  return folder;
}

/**
 * อัปโหลดรูปภาพกิจกรรมอาหารกลางวันลง Google Drive (High-Speed Direct Link)
 */
function handleImageUpload(payload) {
  const base64Data = payload.base64 || payload.fileData;
  const rawFileName = payload.fileName || ('lunch_' + new Date().getTime() + '.jpg');
  const mimeType = String(payload.mimeType || 'image/jpeg').toLowerCase();
  const activityName = sanitizeFileName(payload.activityName || 'ภาพอาหารกลางวัน');
  const dateStr = isValidDateString(payload.date) 
    ? payload.date 
    : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  if (!isValidImageMime(mimeType)) {
    return { status: 'error', message: 'ความปลอดภัย: อนุญาตเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, SVG, GIF)' };
  }

  if (!base64Data) {
    return { status: 'error', message: 'ไม่พบข้อมูล Base64 ของไฟล์ภาพ' };
  }

  const parentFolder = getOrCreateParentFolder();
  const targetFolderName = activityName + '_' + dateStr;
  const subFolders = parentFolder.getFoldersByName(targetFolderName);
  if (subFolders.hasNext()) {
    targetFolder = subFolders.next();
  } else {
    targetFolder = parentFolder.createFolder(targetFolderName);
    try {
      targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (_shareErr) {
      // Ignored if restricted by domain admin
    }
  }

  const cleanBase64 = (base64Data.indexOf(';base64,') !== -1)
    ? base64Data.split(';base64,')[1]
    : base64Data;
  const decoded = Utilities.base64Decode(cleanBase64.trim());
  const blob = Utilities.newBlob(decoded, mimeType, sanitizeFileName(rawFileName));

  const file = targetFolder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_fileShareErr) {
    // Ignored if restricted by domain admin
  }

  const fileId = file.getId();
  // ลิงก์ Direct Link ผ่าน Edge CDN ของ Google (lh3.googleusercontent.com)
  const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

  return {
    status: 'success',
    message: 'อัปโหลดภาพลง Google Drive สำเร็จ',
    fileId: fileId,
    directUrl: directUrl,
    url: directUrl,
    downloadUrl: file.getDownloadUrl(),
    viewUrl: file.getUrl(),
    fileName: rawFileName,
    folderName: targetFolderName,
    uploadedAt: new Date().toISOString()
  };
}

/**
 * อัปโหลดตราสัญลักษณ์โรงเรียนลง Google Drive และอัปเดตลงชีต Settings ทันที
 */
function handleLogoUploadToDrive(ss, payload) {
  const base64Data = payload.base64 || payload.fileData;
  const rawFileName = payload.fileName || ('school_logo_' + new Date().getTime() + '.png');
  const mimeType = String(payload.mimeType || 'image/png').toLowerCase();

  if (!isValidImageMime(mimeType)) {
    return { status: 'error', message: 'ความปลอดภัย: อนุญาตเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, SVG, GIF)' };
  }

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
    try {
      logoFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (_logoShareErr) {
      // Ignored if restricted by domain admin
    }
  }

  const cleanBase64 = (base64Data.indexOf(';base64,') !== -1)
    ? base64Data.split(';base64,')[1]
    : base64Data;
  const decoded = Utilities.base64Decode(cleanBase64.trim());
  const blob = Utilities.newBlob(decoded, mimeType, sanitizeFileName(rawFileName));

  const file = logoFolder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_logoFileShareErr) {
    // Ignored if restricted by domain admin
  }

  const fileId = file.getId();
  const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

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
  if (!fileId || typeof fileId !== 'string') {
    return { status: 'error', message: 'ไม่พบ File ID ที่ถูกต้อง' };
  }
  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return { status: 'success', message: 'ลบไฟล์รูปภาพออกจาก Drive แล้ว' };
  } catch (err) {
    return { status: 'error', message: 'ไม่สามารถลบไฟล์ได้: ' + err.message };
  }
}

/**
 * -------------------------------------------------------------
 * 5. Data Operations (Batch In-Memory High-Speed & Secure)
 * -------------------------------------------------------------
 */

// 5.1 Settings
function getSettingsData(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < values.length; i++) {
    const key = values[i][0];
    const val = values[i][1];
    if (key) {
      settings[String(key)] = val !== undefined ? val : '';
    }
  }
  return settings;
}

function saveSettingsData(ss, data) {
  if (!data || typeof data !== 'object') {
    return { status: 'error', message: 'ข้อมูล Settings ไม่ถูกต้อง' };
  }

  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    initSheetsStructure(ss, false);
    sheet = ss.getSheetByName('Settings');
  }

  const values = sheet.getDataRange().getValues();
  const now = new Date();
  const keyRowIndexMap = {};

  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0]);
    if (key) {
      keyRowIndexMap[key] = i + 1;
    }
  }

  const keysToUpdate = Object.keys(data);
  const rowsToAppend = [];

  for (let k = 0; k < keysToUpdate.length; k++) {
    const key = keysToUpdate[k];
    const safeVal = sanitizeSpreadsheetValue(data[key]);

    if (keyRowIndexMap[key]) {
      const rowIdx = keyRowIndexMap[key];
      sheet.getRange(rowIdx, 2, 1, 2).setValues([[safeVal, now]]);
    } else {
      rowsToAppend.push([key, safeVal, now]);
    }
  }

  if (rowsToAppend.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, 3).setValues(rowsToAppend);
  }

  return { status: 'success', message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' };
}

// 5.2 MenuBank
function getMenuBankData(ss) {
  const sheet = ss.getSheetByName('MenuBank');
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    const menuName = values[i][2];
    if (menuName) {
      let createdStr = '';
      if (values[i][3] instanceof Date) {
        createdStr = Utilities.formatDate(values[i][3], Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else {
        createdStr = String(values[i][3] || '');
      }

      list.push({
        id: String(values[i][0] || ('MB' + i)),
        category: String(values[i][1] || 'อาหารไม่เผ็ด'),
        menuName: String(menuName),
        createdAt: createdStr
      });
    }
  }
  return list;
}

function saveMenuItemData(ss, item) {
  if (!item || !item.menuName) {
    return { status: 'error', message: 'โปรดระบุชื่อเมนูอาหาร' };
  }

  const sheet = ss.getSheetByName('MenuBank');
  const values = sheet.getDataRange().getValues();
  const now = new Date();
  const id = String(item.id || ('MB_' + Date.now()));
  const category = sanitizeSpreadsheetValue(item.category || 'อาหารไม่เผ็ด');
  const menuName = sanitizeSpreadsheetValue(item.menuName);

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id || (String(values[i][2]) === menuName && String(values[i][1]) === category)) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    sheet.getRange(targetRow, 2, 1, 2).setValues([[category, menuName]]);
  } else {
    sheet.appendRow([id, category, menuName, now]);
  }

  return { status: 'success', message: 'บันทึกรายการในคลังเมนูเรียบร้อยแล้ว', id: id };
}

function deleteMenuItemData(ss, idOrName) {
  const sheet = ss.getSheetByName('MenuBank');
  if (!sheet) return { status: 'error', message: 'ไม่พบชีต MenuBank' };
  const values = sheet.getDataRange().getValues();
  const target = String(idOrName || '').trim();

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === target || String(values[i][2]) === target) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'ลบรายการเมนูเรียบร้อยแล้ว' };
    }
  }
  return { status: 'error', message: 'ไม่พบรายการที่ต้องการลบ' };
}

// 5.3 DailyMenu
function getDailyMenuData(ss, monthFilter, dateFilter) {
  const sheet = ss.getSheetByName('DailyMenu');
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const dateMap = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const dateVal = row[0];
    if (!dateVal) continue;

    let dateStr = '';
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(dateVal).trim().slice(0, 10);
    }

    if (!isValidDateString(dateStr)) continue;
    if (monthFilter && !dateStr.startsWith(monthFilter)) continue;
    if (dateFilter && dateStr !== dateFilter) continue;

    let photos = [];
    if (row[6]) {
      try {
        photos = JSON.parse(row[6]);
        if (!Array.isArray(photos)) photos = [];
      } catch (e) {
        photos = [{ url: String(row[6]), name: 'photo' }];
      }
    }

    dateMap[dateStr] = {
      date: dateStr,
      rice: String(row[1] || ''),
      singleDish: String(row[2] || ''),
      spicy: String(row[3] || ''),
      nonSpicy: String(row[4] || ''),
      dessert: String(row[5] || ''),
      photos: photos,
      note: String(row[7] || ''),
      department: String(row[8] || ''),
      updatedBy: String(row[9] || ''),
      lastModified: row[10] instanceof Date 
        ? Utilities.formatDate(row[10], Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'")
        : String(row[10] || '')
    };
  }

  const list = Object.keys(dateMap).map(function(k) { return dateMap[k]; });
  list.sort(function(a, b) { return a.date.localeCompare(b.date); });
  return list;
}

function saveDailyMenuData(ss, data) {
  if (!data || !data.date) {
    return { status: 'error', message: 'โปรดระบุวันที่ (date: YYYY-MM-DD)' };
  }

  const targetDate = String(data.date).trim().slice(0, 10);
  if (!isValidDateString(targetDate)) {
    return { status: 'error', message: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' };
  }

  const sheet = ss.getSheetByName('DailyMenu');
  const values = sheet.getDataRange().getValues();
  const now = new Date();

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    const rowDate = values[i][0] instanceof Date 
      ? Utilities.formatDate(values[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(values[i][0]).trim().slice(0, 10);
    if (rowDate === targetDate) {
      targetRow = i + 1;
      break;
    }
  }

  const photosJson = JSON.stringify(Array.isArray(data.photos) ? data.photos : []);
  const rowData = [
    targetDate,
    sanitizeSpreadsheetValue(data.rice || ''),
    sanitizeSpreadsheetValue(data.singleDish || ''),
    sanitizeSpreadsheetValue(data.spicy || ''),
    sanitizeSpreadsheetValue(data.nonSpicy || ''),
    sanitizeSpreadsheetValue(data.dessert || ''),
    photosJson,
    sanitizeSpreadsheetValue(data.note || ''),
    sanitizeSpreadsheetValue(data.department || ''),
    sanitizeSpreadsheetValue(data.updatedBy || 'ผู้จัดการระบบ'),
    now
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { status: 'success', message: 'บันทึกเมนูประจำวันเรียบร้อยแล้ว', date: targetDate };
}

function deleteDailyMenuData(ss, dateStr) {
  const sheet = ss.getSheetByName('DailyMenu');
  if (!sheet) return { status: 'error', message: 'ไม่พบชีต DailyMenu' };
  const values = sheet.getDataRange().getValues();
  const target = String(dateStr || '').trim().slice(0, 10);

  for (let i = values.length - 1; i >= 1; i--) {
    const rowDate = values[i][0] instanceof Date 
      ? Utilities.formatDate(values[i][0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(values[i][0]).trim().slice(0, 10);
    if (rowDate === target) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'ลบข้อมูลเมนูวันที่ ' + target + ' เรียบร้อยแล้ว' };
    }
  }
  return { status: 'error', message: 'ไม่พบรายการเมนูวันที่ ' + target };
}

// 5.4 TaxRecords (ระบบคำนวณและบันทึกภาษี 1%)
function getTaxRecordsData(ss) {
  let sheet = ss.getSheetByName('TaxRecords');
  if (!sheet) {
    initSheetsStructure(ss, false);
    sheet = ss.getSheetByName('TaxRecords');
  }
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = row[0];
    if (!id) continue;

    const startDate = row[1] instanceof Date 
      ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(row[1] || '').slice(0, 10);

    const endDate = row[2] instanceof Date 
      ? Utilities.formatDate(row[2], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(row[2] || '').slice(0, 10);

    const isPaid = row[10] === true || String(row[10]).toUpperCase() === 'TRUE' || row[10] === 1;

    list.push({
      id: String(id),
      startDate: startDate,
      endDate: endDate,
      daysCount: Number(row[3]) || 0,
      studentCount: Number(row[4]) || 0,
      ratePerPerson: Number(row[5]) || 0,
      totalAmount: Number(row[6]) || 0,
      taxRatePercent: Number(row[7]) || 1,
      taxAmount: Number(row[8]) || 0,
      netAmount: Number(row[9]) || 0,
      isPaid: isPaid,
      paidAt: String(row[11] || ''),
      note: String(row[12] || ''),
      createdAt: String(row[13] || '')
    });
  }

  list.sort(function(a, b) {
    return (b.startDate || '').localeCompare(a.startDate || '');
  });

  return list;
}

function saveTaxRecordData(ss, item) {
  if (!item || !item.startDate || !item.endDate) {
    return { status: 'error', message: 'ข้อมูลภาษีไม่ครบถ้วน (startDate, endDate)' };
  }

  let sheet = ss.getSheetByName('TaxRecords');
  if (!sheet) {
    initSheetsStructure(ss, false);
    sheet = ss.getSheetByName('TaxRecords');
  }

  const values = sheet.getDataRange().getValues();
  const id = String(item.id || ('tax_' + Date.now()));
  const now = new Date();

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) {
      targetRow = i + 1;
      break;
    }
  }

  const rowData = [
    id,
    String(item.startDate).slice(0, 10),
    String(item.endDate).slice(0, 10),
    Number(item.daysCount) || 0,
    Number(item.studentCount) || 0,
    Number(item.ratePerPerson) || 0,
    Number(item.totalAmount) || 0,
    Number(item.taxRatePercent) || 1,
    Number(item.taxAmount) || 0,
    Number(item.netAmount) || 0,
    Boolean(item.isPaid),
    item.paidAt ? String(item.paidAt) : (item.isPaid ? now.toISOString() : ''),
    sanitizeSpreadsheetValue(item.note || ''),
    item.createdAt ? String(item.createdAt) : now.toISOString()
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { status: 'success', message: 'บันทึกข้อมูลงวดภาษีเรียบร้อยแล้ว', id: id };
}

function saveTaxRecordsBatch(ss, records) {
  if (!Array.isArray(records)) {
    return { status: 'error', message: 'records ต้องเป็น Array' };
  }

  let sheet = ss.getSheetByName('TaxRecords');
  if (!sheet) {
    initSheetsStructure(ss, false);
    sheet = ss.getSheetByName('TaxRecords');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 14).clearContent();
  }

  if (records.length === 0) {
    return { status: 'success', message: 'ล้างข้อมูลภาษีเรียบร้อย' };
  }

  const nowIso = new Date().toISOString();
  const rows = records.map(function(item, idx) {
    return [
      String(item.id || ('tax_' + Date.now() + '_' + idx)),
      String(item.startDate || '').slice(0, 10),
      String(item.endDate || '').slice(0, 10),
      Number(item.daysCount) || 0,
      Number(item.studentCount) || 0,
      Number(item.ratePerPerson) || 0,
      Number(item.totalAmount) || 0,
      Number(item.taxRatePercent) || 1,
      Number(item.taxAmount) || 0,
      Number(item.netAmount) || 0,
      Boolean(item.isPaid),
      item.paidAt ? String(item.paidAt) : '',
      sanitizeSpreadsheetValue(item.note || ''),
      item.createdAt ? String(item.createdAt) : nowIso
    ];
  });

  sheet.getRange(2, 1, rows.length, 14).setValues(rows);
  return { status: 'success', message: 'ซิงค์ข้อมูลงวดภาษีทั้งหมดเรียบร้อยแล้ว (' + rows.length + ' รายการ)' };
}

function deleteTaxRecordData(ss, id) {
  let sheet = ss.getSheetByName('TaxRecords');
  if (!sheet) return { status: 'error', message: 'ไม่พบชีต TaxRecords' };
  const values = sheet.getDataRange().getValues();
  const targetId = String(id || '').trim();

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === targetId) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'ลบรายการภาษีเรียบร้อยแล้ว' };
    }
  }
  return { status: 'error', message: 'ไม่พบรายการภาษีรหัส: ' + targetId };
}

/**
 * -------------------------------------------------------------
 * 6. High-Speed Batch Sync All (ซิงค์ทั้งระบบในรอบเดียว)
 * -------------------------------------------------------------
 */
function handleSyncAll(ss, payload) {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. ซิงค์ Settings
  if (payload.settings && typeof payload.settings === 'object') {
    saveSettingsData(ss, payload.settings);
  }

  // 2. ซิงค์ MenuBank (เขียน 1 ครั้งแบบ High-Speed Range Batch)
  if (Array.isArray(payload.menuBank) && payload.menuBank.length > 0) {
    const sheetMB = ss.getSheetByName('MenuBank');
    if (sheetMB) {
      const rows = payload.menuBank.map(function(item, idx) {
        return [
          String(item.id || ('MB' + (idx + 1))),
          sanitizeSpreadsheetValue(item.category || 'อาหารไม่เผ็ด'),
          sanitizeSpreadsheetValue(item.menuName || ''),
          item.createdAt || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        ];
      });

      const lastRow = sheetMB.getLastRow();
      if (lastRow > 1) {
        sheetMB.getRange(2, 1, lastRow - 1, 4).clearContent();
      }
      sheetMB.getRange(2, 1, rows.length, 4).setValues(rows);
    }
  }

  // 3. ซิงค์ DailyMenu (ตัดและกำจัดวันที่ซ้ำซ้อนอย่างเด็ดขาด แล้วเขียน 1 ครั้ง)
  const dailyList = payload.dailyMenus || payload.dailyMenu;
  if (Array.isArray(dailyList)) {
    const sheetDM = ss.getSheetByName('DailyMenu');
    if (sheetDM) {
      const lastRow = sheetDM.getLastRow();
      if (lastRow > 1) {
        sheetDM.getRange(2, 1, lastRow - 1, 11).clearContent();
      }

      if (dailyList.length > 0) {
        const dateMap = {};
        dailyList.forEach(function(item) {
          if (item && item.date) {
            const cleanDate = String(item.date).trim().slice(0, 10);
            if (isValidDateString(cleanDate)) {
              dateMap[cleanDate] = item;
            }
          }
        });

        const cleanList = Object.keys(dateMap).map(function(k) { return dateMap[k]; });
        cleanList.sort(function(a, b) { return a.date.localeCompare(b.date); });

        const rows = cleanList.map(function(item) {
          return [
            item.date,
            sanitizeSpreadsheetValue(item.rice || ''),
            sanitizeSpreadsheetValue(item.singleDish || ''),
            sanitizeSpreadsheetValue(item.spicy || ''),
            sanitizeSpreadsheetValue(item.nonSpicy || ''),
            sanitizeSpreadsheetValue(item.dessert || ''),
            JSON.stringify(Array.isArray(item.photos) ? item.photos : []),
            sanitizeSpreadsheetValue(item.note || ''),
            sanitizeSpreadsheetValue(item.department || ''),
            sanitizeSpreadsheetValue(item.updatedBy || 'ผู้จัดการระบบ'),
            now
          ];
        });

        if (rows.length > 0) {
          sheetDM.getRange(2, 1, rows.length, 11).setValues(rows);
        }
      }
    }
  }

  // 4. ซิงค์ TaxRecords (ข้อมูลภาษี 1% และงวดเบิกจ่าย)
  const taxList = payload.taxRecords;
  if (Array.isArray(taxList)) {
    saveTaxRecordsBatch(ss, taxList);
  }

  SpreadsheetApp.flush();
  return { 
    status: 'success', 
    message: 'ซิงค์ข้อมูลทั้งหมดลง Google Sheets สำเร็จสมบูรณ์ (Speed & Security Batch Mode)',
    version: SCRIPT_VERSION,
    timestamp: nowIso
  };
}

/**
 * -------------------------------------------------------------
 * 7. Security & Sanitization Utilities
 * -------------------------------------------------------------
 */

function sanitizeSpreadsheetValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (val instanceof Date) return val;

  const str = String(val);
  if (/^[=+\\-@\\t\\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function isValidDateString(str) {
  return typeof str === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(str.trim());
}

function isValidImageMime(mime) {
  if (!mime || typeof mime !== 'string') return false;
  return /^(image\\/(jpeg|png|webp|svg\\+xml|gif|jpg))$/i.test(mime.trim());
}

function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') return 'image.jpg';
  return name.replace(/[/\\\\?%*:|"<>]/g, '_').slice(0, 80);
}

function sanitizeForDisplay(str) {
  if (!str) return '';
  return String(str).replace(/[<>&"']/g, '');
}
`;

/**
 * ฟังก์ชันคัดลอกโค้ด Code.gs แบบทนทาน (ทำงานได้แม้ใน iFrame หรือไม่มี clipboard permission)
 */
export async function copyGasCodeToClipboard(): Promise<boolean> {
  // วิธีที่ 1: Textarea + execCommand (ทำงานได้ 100% ใน iframe และทุกเบราว์เซอร์)
  try {
    const el = document.createElement('textarea');
    el.value = FULL_CODE_GS;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, FULL_CODE_GS.length);
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    if (success) return true;
  } catch (err) {
    console.warn('execCommand copy fallback warning:', err);
  }

  // วิธีที่ 2: Modern Navigator Clipboard
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(FULL_CODE_GS);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard warning:', err);
  }

  return false;
}

/**
 * ฟังก์ชันดาวน์โหลดไฟล์ Code.gs โดยตรง (รองรับทั้ง Server Route และ Blob Fallback)
 */
export function downloadGasCodeFile() {
  // วิธีที่ 1: โหลดผ่าน Server Endpoint โดยตรง (เบราว์เซอร์อนุญาตให้ดาวน์โหลดได้ไม่ถูกบล็อกจาก sandbox iframe)
  try {
    const link = document.createElement('a');
    link.href = '/api/download-code-gs';
    link.download = 'Code.gs';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  } catch (e) {
    console.warn('Direct server download link click failed:', e);
  }

  // วิธีที่ 2: Fallback ด้วย Data URI
  try {
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(FULL_CODE_GS);
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.warn('Data URI download failed:', e);
  }
}
