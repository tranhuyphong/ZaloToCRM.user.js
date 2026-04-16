// ==UserScript==
// @name         ZALO TO CRM - BẢN 57.0 (AUTO UPDATE CHUẨN)
// @version      57.0
// @description  Sửa lỗi nhận diện chữ in hoa có dấu (Đ) trên CRM, tự động nắn chính tả tỉnh thành bằng Levenshtein.
// @author       Thạch (Gemini)
// @match        https://crm.tbd.edu.vn/*
// @updateURL    https://raw.githubusercontent.com/tranhuyphong/ZaloToCRM.user.js/main/ZaloToCRM.user.js
// @downloadURL  https://raw.githubusercontent.com/tranhuyphong/ZaloToCRM.user.js/main/ZaloToCRM.user.js
// @grant        GM_setClipboard
// @grant        GM_readClipboard
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // --- CHUẨN HÓA XÓA DẤU & KHOẢNG TRẮNG ---
    function normalizeTextStrict(str) {
        if (!str) return "";
        str = str.toLowerCase(); // FIX LỖI: Bắt buộc hạ thành chữ thường TRƯỚC KHI xóa dấu
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        return str.replace(/\s+/g, '').trim();
    }

    // --- THUẬT TOÁN ĐO ĐỘ LỆCH CHÍNH TẢ (LEVENSHTEIN DISTANCE) ---
    function getEditDistance(a, b) {
        if(a.length === 0) return b.length;
        if(b.length === 0) return a.length;
        let matrix = [];
        for(let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for(let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for(let i = 1; i <= b.length; i++) {
            for(let j = 1; j <= a.length; j++) {
                if(b.charAt(i-1) == a.charAt(j-1)) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // --- TỪ ĐIỂN 63 TỈNH THÀNH ---
    const PROVINCES = [
        { c: "01", n: ["hanoi","hn"] }, { c: "02", n: ["hochiminh","hcm","saigon"] }, { c: "03", n: ["haiphong","hp"] },
        { c: "04", n: ["danang","dn"] }, { c: "05", n: ["hagiang"] }, { c: "06", n: ["caobang"] },
        { c: "07", n: ["laichau"] }, { c: "08", n: ["laocai"] }, { c: "09", n: ["tuyenquang"] },
        { c: "10", n: ["langson"] }, { c: "11", n: ["backan"] }, { c: "12", n: ["thainguyen"] },
        { c: "13", n: ["yenbai"] }, { c: "14", n: ["sonla"] }, { c: "15", n: ["phutho"] },
        { c: "16", n: ["vinhphuc"] }, { c: "17", n: ["quangninh"] }, { c: "18", n: ["bacgiang"] },
        { c: "19", n: ["bacninh"] }, { c: "21", n: ["haiduong"] }, { c: "22", n: ["hungyen"] },
        { c: "23", n: ["hoabinh"] }, { c: "24", n: ["hanam"] }, { c: "25", n: ["namdinh"] },
        { c: "26", n: ["thaibinh"] }, { c: "27", n: ["ninhbinh"] }, { c: "28", n: ["thanhhoa"] },
        { c: "29", n: ["nghean"] }, { c: "30", n: ["hatinh"] }, { c: "31", n: ["quangbinh"] },
        { c: "32", n: ["quangtri"] }, { c: "33", n: ["thuathienhue","hue"] }, { c: "34", n: ["quangnam"] },
        { c: "35", n: ["quangngai"] }, { c: "36", n: ["kontum"] }, { c: "37", n: ["binhdinh"] },
        { c: "38", n: ["gialai"] }, { c: "39", n: ["phuyen"] }, { c: "40", n: ["daklak","daclac"] },
        { c: "41", n: ["khanhhoa"] }, { c: "42", n: ["lamdong","dalat"] }, { c: "43", n: ["ninhthuan"] },
        { c: "44", n: ["binhthuan"] }, { c: "45", n: ["tayninh"] }, { c: "46", n: ["binhphuoc"] },
        { c: "47", n: ["binhduong"] }, { c: "48", n: ["dongnai","bienhoa"] }, { c: "49", n: ["bariavungtau","vungtau"] },
        { c: "50", n: ["dongthap"] }, { c: "51", n: ["angiang"] }, { c: "52", n: ["travinh"] },
        { c: "53", n: ["vinhlong"] }, { c: "54", n: ["cantho"] }, { c: "55", n: ["haugiang"] },
        { c: "56", n: ["bentre"] }, { c: "57", n: ["tiengiang"] }, { c: "58", n: ["kiengiang"] },
        { c: "59", n: ["soctrang"] }, { c: "60", n: ["baclieu"] }, { c: "61", n: ["camau"] },
        { c: "62", n: ["dienbien"] }, { c: "63", n: ["daknong","dacnong"] }
    ];

    // --- AI SỬA CHÍNH TẢ TỈNH ---
    function detectAndFixProvince(inputStr) {
        let t = normalizeTextStrict(inputStr);
        if (!t) return null;

        let bestMatch = null;
        let minDistance = 999;

        for (let p of PROVINCES) {
            for (let name of p.n) {
                if (t === name || t.includes(name)) return { code: p.c, name: p.n[0] };

                let dist = getEditDistance(t, name);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestMatch = { code: p.c, name: p.n[0] };
                }
            }
        }

        if (minDistance <= 2 && t.length > 3) {
            return bestMatch;
        }
        return null;
    }

    // --- HÀM TÌM THẺ SELECT QUA NHÃN ---
    function findSelectByLabel(labelText, isExact = false) {
        let selects = document.querySelectorAll('select');
        for (let sel of selects) {
            let lbl = "";
            let td = sel.closest('td');
            if (td && td.previousElementSibling) {
                lbl = td.previousElementSibling.innerText.toLowerCase().trim();
            } else {
                let parent = sel.parentElement;
                if (parent && parent.previousElementSibling) {
                    lbl = parent.previousElementSibling.innerText.toLowerCase().trim();
                }
            }
            if (lbl) {
                if (isExact && lbl === labelText) return sel;
                if (!isExact && lbl.includes(labelText)) return sel;
            }
        }
        return null;
    }

    // --- ÉP CHỌN DROPDOWN CRM ---
    function forceSelectDropdown(selectEl, searchText, isCode = false) {
        if (!selectEl || !searchText) return false;

        let normalizedSearch = normalizeTextStrict(searchText);
        let matchFound = false;
        let matchedValue = "";

        Array.from(selectEl.options).forEach(option => {
            if (matchFound) return;
            if (isCode) {
                let regex = new RegExp(`\\b${searchText}\\b`);
                if (option.value === searchText || regex.test(option.text)) {
                    matchedValue = option.value;
                    matchFound = true;
                }
            } else {
                if (normalizeTextStrict(option.text).includes(normalizedSearch)) {
                    matchedValue = option.value;
                    matchFound = true;
                }
            }
        });

        if (matchFound && matchedValue) {
            selectEl.value = matchedValue;
            selectEl.dispatchEvent(new Event("change", { bubbles: true }));

            let jq = typeof unsafeWindow !== 'undefined' && unsafeWindow.jQuery ? unsafeWindow.jQuery : (window.jQuery || window.$);
            if (jq) {
                jq(selectEl).val(matchedValue).trigger('change');
                jq(selectEl).trigger('change.select2');
                jq(selectEl).trigger('liszt:updated');
            }
            let visibleDropdown = selectEl.nextElementSibling;
            if(visibleDropdown) visibleDropdown.style.border = '2px solid #FF9800';
            return true;
        }
        return false;
    }

    // --- GIAO DIỆN ---
    const showToast = (msg, type = 'info') => {
        let toast = document.createElement('div');
        toast.innerHTML = msg;
        toast.style.cssText = `position: fixed; top: 30px; right: 30px; z-index: 10000; padding: 15px 25px; border-radius: 8px; color: white; font-weight: bold; font-size: 14px; background: ${type === 'success' ? '#4CAF50' : '#F44336'}; box-shadow: 0 4px 15px rgba(0,0,0,0.4); line-height: 1.5;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
    };

    let btnHut = document.createElement('button');
    btnHut.innerHTML = '🎯 HÚT & BƠM (V57.0 - AUTO UPDATE)';
    btnHut.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; padding: 15px 25px; background: #E91E63; color: white; border-radius: 30px; cursor: pointer; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.4); transition: 0.3s;';
    document.body.appendChild(btnHut);

    // --- XỬ LÝ CHÍNH ---
    btnHut.onclick = async function() {
        try {
            let originalText = await navigator.clipboard.readText();
            if (!originalText) { showToast("⚠️ Chưa copy tin nhắn!", "error"); return; }

            let data = { truong: "", tinh_truong: "", ngaysinh: "", email: "", cccd: "", diachi: "", tinh_diachi: "", sdt_ph: "", ten_ph: "", diem10: "", diem11: "", diem12: "", mota: "" };
            let wText = originalText.replace(/([a-zA-ZÀ-ỹ])(sdt|sđt|0[35789])/gi, '$1 $2').replace(/(sdt|sđt)(0[35789])/gi, '$1 $2').replace(/🌐|Zalo Web:|Đã nhận:/gi, ' ');
            let blocksToRemove = [];

            function extract(regex, isGroup = false) {
                let match = wText.match(regex);
                if (match) {
                    blocksToRemove.push(match[0]);
                    wText = wText.replace(match[0], ' '.repeat(match[0].length));
                    let result = (isGroup ? match[1] : match[0]).trim();
                    return result.replace(/,(\d)/g, '.$1');
                }
                return "";
            }

            data.cccd = extract(/(?:cccd|căn cước|cmnd)?\s*[:\-]?\s*(\d{12})\b/i, true) || extract(/\b\d{12}\b/);
            data.email = extract(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            data.ngaysinh = extract(/(?:ngày sinh|ns)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/i, true) || extract(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/);

            let sdtMatch = wText.match(/(?:sdt|sđt|đt|-|:)?\s*(0[35789]\d{8})\b/i);
            if (sdtMatch) {
                data.sdt_ph = sdtMatch[1];
                blocksToRemove.push(sdtMatch[0]);
                let beforeSdt = wText.substring(0, sdtMatch.index);
                let nameMatch = beforeSdt.match(/((?:[\p{Lu}][\p{Ll}]+\s+){1,4}[\p{Lu}][\p{Ll}]+)\s*[^\w]*$/u);
                if (nameMatch) {
                    data.ten_ph = nameMatch[1].trim();
                    blocksToRemove.push(nameMatch[0]);
                    wText = wText.replace(nameMatch[0], ' ');
                }
                wText = wText.replace(sdtMatch[0], ' ');
            }

            data.diem10 = extract(/(?:10|lớp 10|l10)[^\d]*(\d{1,2}[.,]\d{1,2})/i, true);
            data.diem11 = extract(/(?:11|lớp 11|l11)[^\d]*(\d{1,2}[.,]\d{1,2})/i, true);
            data.diem12 = extract(/(?:12|lớp 12|hk1 12|hk1)[^\d]*(\d{1,2}[.,]\d{1,2})/i, true);

            let stopWords = "\\s*-|\\s*ngày sinh|\\s*email|\\s*cccd|\\s*địa chỉ|\\s*sđt|\\s*sdt|\\s*điểm|$";

            // TRƯỜNG & TỈNH TRƯỜNG
            let truongRegex = new RegExp(`(?:trường|thpt)\\s+([^]+?)(?=${stopWords})`, 'i');
            let rawTruong = extract(truongRegex, true);
            if (rawTruong) {
                rawTruong = rawTruong.replace(/[\.\-:\n]+$/, '').trim();
                let matchTruong = rawTruong.match(/(.+?)(?:,\s*|\s+)(?:tỉnh|tp\.|tp|thành phố)\s+(.+)/i);
                if (matchTruong) {
                    data.truong = matchTruong[1].trim();
                    data.tinh_truong = matchTruong[2].replace(/\.$/, "").trim();
                } else { data.truong = rawTruong; }
            }

            // ĐỊA CHỈ & TỈNH ĐỊA CHỈ
            let diachiRegex = new RegExp(`(?:địa chỉ|thường trú)\\s*[:\\-]?\\s*([^]+?)(?=${stopWords})`, 'i');
            let rawDiaChi = extract(diachiRegex, true);
            if(rawDiaChi) {
                rawDiaChi = rawDiaChi.replace(/[\.\-:\n]+$/, '').trim();
                let matchDiaChi = rawDiaChi.match(/(.+?)(?:,\s*|\s+)(?:tỉnh|tp\.|tp|thành phố)\s+(.+)/i);
                if (matchDiaChi) {
                    data.diachi = matchDiaChi[1].trim();
                    data.tinh_diachi = matchDiaChi[2].replace(/\.$/, "").trim();
                } else { data.diachi = rawDiaChi; }
            }

            let leftover = originalText;
            blocksToRemove.forEach(block => { leftover = leftover.replace(block, ' '); });
