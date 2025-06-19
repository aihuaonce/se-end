// backend/AI/generateAvatar.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
// 引入 getAuthClient，用於 Google Drive API 認證
const { readGoogleSheet, updateGoogleSheetCell, getAuthClient } = require('../AI/googleSheetsService');
const textToSpeech = require('@google-cloud/text-to-speech');
const sharp = require('sharp'); // Import sharp library for image processing
const { google } = require('googleapis'); // 引入 googleapis 用於 Google Drive API

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
// 從環境變數中獲取 Google Drive 資料夾 ID
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// 設定暫存檔案儲存目錄
const TEMP_DIR = path.join(__dirname, 'wav2lip_temp_files');

// 初始化 Google Cloud Text-to-Speech 客戶端
let ttsClient;
try {
    const keyFileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!keyFileName) {
        console.warn("GOOGLE_APPLICATION_CREDENTIALS 環境變數未設定，語音合成功能可能無法運作。");
    } else {
        const backendDir = path.dirname(require.main.filename);
        const absoluteKeyFilePath = path.join(backendDir, keyFileName);
        ttsClient = new textToSpeech.TextToSpeechClient({
            keyFilename: absoluteKeyFilePath,
        });
        console.log('✅ Google Cloud Text-to-Speech 客戶端初始化成功！');
    }
} catch (error) {
    console.error('初始化 Google Cloud Text-to-Speech 客戶端失敗:', error);
}

// 檢查 Google Drive 資料夾 ID 是否已設定
if (!GOOGLE_DRIVE_FOLDER_ID) {
    console.warn("⚠️ 警告：GOOGLE_DRIVE_FOLDER_ID 環境變數未設定。生成的影片將無法上傳到 Google Drive。請檢查 .env 檔案。");
}

/**
 * 確保暫存目錄存在。
 * @param {string} dirPath - 要檢查或建立的目錄路徑。
 */
const ensureDirExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`已建立暫存目錄: ${dirPath}`);
    }
};

/**
 * 清理暫存檔案和目錄。
 * @param {string} dirPath - 要清理的目錄路徑。
 */
const cleanupTempFiles = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`暫存工作目錄 ${dirPath} 已被清理。`);
    } else {
        console.log(`暫存工作目錄 ${dirPath} 不存在，無需清理。`);
    }
};

/**
 * 下載 Google Drive 檔案。
 * @param {string} driveUrl - Google Drive 分享連結。
 * @param {string} outputPath - 要儲存下載檔案的路徑。
 * @returns {Promise<string>} - 下載檔案的路徑。
 */
const downloadGoogleDriveFile = async (driveUrl, outputPath) => {
    const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!fileIdMatch || !fileIdMatch[1]) {
        throw new Error('無效的 Google Drive URL。');
    }
    const fileId = fileIdMatch[1];
    const directDownloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;

    console.log(`正在下載檔案: ${directDownloadUrl} 到 ${outputPath}`);
    try {
        const response = await fetch(directDownloadUrl);
        if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes('Quota exceeded') || errorText.includes('Daily download quota exceeded')) {
                throw new Error('Google Drive 下載配額已用完，請稍後再試。');
            }
            throw new Error(`下載失敗，HTTP 狀態: ${response.status} - ${errorText.substring(0, 200)}...`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        fs.writeFileSync(outputPath, buffer);
        console.log(`成功下載檔案到: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error(`下載 Google Drive 檔案失敗 (${driveUrl}):`, error);
        throw error;
    }
};

/**
 * 處理影像緩衝區並將其儲存為標準 JPG 格式。
 * 這有助於清理影像中繼資料並確保與 OpenCV 的兼容性。
 * 它還會積極調整影像大小以減少 Wav2Lip 的 GPU 記憶體使用。
 * @param {Buffer} inputBuffer - 輸入影像的緩衝區。
 * @param {string} outputPath - 要儲存處理後影像的路徑。
 * @returns {Promise<string>} - 處理後影像的路徑。
 */
const processAndSaveImage = async (inputBuffer, outputPath) => {
    console.log(`正在處理影像並儲存為標準 JPG: ${outputPath}`);
    try {
        // 使用 sharp 處理並轉換為乾淨的 JPG 格式
        // 將圖片的最大寬度/高度限制在 128px，同時保持長寬比。
        // 這將大幅減少記憶體使用，希望能解決 CUDA OOM 問題。
        await sharp(inputBuffer)
            .resize({ width: 128, height: 128, fit: sharp.fit.inside, withoutEnlargement: true })
            .jpeg({
                quality: 90,
                progressive: true,
                chromaSubsampling: '4:4:4',
                mozjpeg: true
            })
            .toFile(outputPath);
        console.log(`成功處理並儲存影像到: ${outputPath}`);
        return outputPath;
    }
    catch (error) {
        console.error(`處理並儲存影像到 ${outputPath} 失敗:`, error);
        throw error;
    }
};

/**
 * 使用 Wav2Lip 生成影片。
 * @param {string} faceImagePath - 包含臉部的影像路徑。
 * @param {string} audioPath - 音訊檔案路徑。
 * @param {string} outputPath - 輸出影片的路徑。
 * @param {string} tempDirPath - 暫存目錄的路徑。
 * @returns {Promise<string>} - 生成影片的路徑。
 */
const generateWav2LipVideo = (faceImagePath, audioPath, outputPath, tempDirPath) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'wav2lip_repo', 'inference.py');
        const checkpointPath = path.join(__dirname, 'wav2lip_repo', 'checkpoints', 'wav2lip_gan.pth');

        if (!fs.existsSync(checkpointPath)) {
            console.error(`Wav2Lip 模型未找到: ${checkpointPath}`);
            return reject(new Error(`Wav2Lip 模型未找到。請確保 'wav2lip_gan.pth' 檔案在 ${path.join(__dirname, 'wav2lip_repo', 'checkpoints')} 中。`));
        }

        console.log(`正在使用 Wav2Lip 生成影片...`);
        console.log(`影像: ${faceImagePath}, 音訊: ${audioPath}, 輸出: ${outputPath}`);

        // 轉換 Windows 路徑為正斜線，以兼容 Python
        const normalizedFaceImagePath = faceImagePath.replace(/\\/g, '/');
        const normalizedAudioPath = audioPath.replace(/\\/g, '/');
        const normalizedOutputPath = outputPath.replace(/\\/g, '/');
        const normalizedCheckpointPath = checkpointPath.replace(/\\/g, '/');

        const args = [
            'python', scriptPath,
            '--checkpoint_path', normalizedCheckpointPath,
            '--face', normalizedFaceImagePath,
            '--audio', normalizedAudioPath,
            '--outfile', normalizedOutputPath,
            '--resize_factor', '2', // 保留此參數作為額外安全措施
        ];

        console.log(`DEBUG: 正在執行 Python 進程指令: ${args.join(' ')}`);

        const pythonProcess = spawn(args[0], args.slice(1), {
            cwd: path.join(__dirname, 'wav2lip_repo'),
            stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`Wav2Lip 標準輸出: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`Wav2Lip 標準錯誤: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`Wav2Lip 影片生成成功: ${outputPath}`);
                resolve(outputPath);
            } else {
                console.error(`Wav2Lip 進程以代碼 ${code} 退出。`);
                console.error(`標準輸出: ${stdout}`);
                console.error(`標準錯誤: ${stderr}`);
                reject(new Error(`Wav2Lip 影片生成失敗，退出代碼 ${code}。錯誤訊息: ${stderr || '無'}`));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Wav2Lip 進程啟動失敗或遇到運行時錯誤:', err);
            reject(new Error(`Wav2Lip 進程錯誤: ${err.message}`));
        });
    });
};

/**
 * 使用 Google Cloud Text-to-Speech API 從文字生成音訊檔案。
 * @param {string} text - 要轉換為語音的文字。
 * @returns {Promise<Buffer>} - 音訊檔案的二進制數據。
 */
async function generateAudioFromText(text) {
    if (!ttsClient) {
        throw new Error("Google Cloud Text-to-Speech 客戶端未初始化。請檢查服務帳戶憑證和環境變數。");
    }
    if (!text || text.trim() === '') {
        throw new Error("提供的文字為空，無法生成語音。");
    }

    console.log(`正在使用 Google Cloud Text-to-Speech API 生成音訊...`);

    const request = {
        input: { text: text },
        voice: { languageCode: 'zh-TW', name: 'cmn-TW-Wavenet-A' }, // 確保使用您想要的語言和聲音
        audioConfig: { audioEncoding: 'MP3' },
    };

    try {
        const [response] = await ttsClient.synthesizeSpeech(request);
        console.log('Google Cloud Text-to-Speech API 音訊內容生成成功。');
        return Buffer.from(response.audioContent);
    } catch (error) {
        console.error('Google Cloud Text-to-Speech API 音訊生成失敗:', error);
        throw new Error(`TTS 音訊生成失敗: ${error.message}`);
    }
}

/**
 * 將檔案上傳到 Google Drive 並使其公開可存取。
 * @param {string} filePath - 要上傳的本地檔案路徑。
 * @param {string} fileName - 在 Google Drive 上顯示的檔案名稱。
 * @param {string} mimeType - 檔案的 MIME 類型 (例如 'video/mp4')。
 * @returns {Promise<string>} 上傳檔案的公共 URL (webViewLink)。
 * @throws {Error} 如果上傳失敗或缺少資料夾 ID。
 */
async function uploadFileToGoogleDrive(filePath, fileName, mimeType) {
    if (!GOOGLE_DRIVE_FOLDER_ID) {
        console.error("錯誤：GOOGLE_DRIVE_FOLDER_ID 環境變數未設定，無法上傳檔案到 Google Drive。");
        throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set.");
    }

    try {
        const auth = await getAuthClient(); // 從 googleSheetsService 獲取認證客戶端
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: fileName,
            parents: [GOOGLE_DRIVE_FOLDER_ID]
        };
        const media = {
            mimeType: mimeType,
            body: fs.createReadStream(filePath)
        };

        console.log(`正在上傳檔案 '${fileName}' 到 Google Drive 資料夾 ID: ${GOOGLE_DRIVE_FOLDER_ID}...`);
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id,webViewLink,webContentLink,thumbnailLink' // 請求返回 id 和可視化連結, thumbnailLink
        });
        console.log(`檔案上傳成功，ID: ${file.data.id}`);

        // 設定檔案權限為公開
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
            fields: 'id', // 只請求 id 字段
        });
        console.log(`檔案 '${fileName}' 已設定為公開可讀取。`);

        // 返回 webViewLink 作為公共 URL
        // webViewLink 通常用於在瀏覽器中查看檔案，對於影片播放可能更好
        console.log(`Google Drive 公開連結: ${file.data.webViewLink}`);
        return file.data.webViewLink;
    } catch (error) {
        console.error(`上傳檔案到 Google Drive 失敗:`, error);
        // 增加更詳細的錯誤訊息，特別是針對 Google API 錯誤
        if (error.response && error.response.data && error.response.data.error) {
            console.error("Google Drive API 錯誤詳細資訊:", error.response.data.error);
            throw new Error(`上傳檔案到 Google Drive 失敗: ${error.response.data.error.message}`);
        }
        throw new Error(`上傳檔案到 Google Drive 失敗: ${error.message}`);
    }
}

/**
 * 處理單一賓客的 AI 影片生成流程。
 * @param {Object} guestData - 賓客數據物件。
 * @param {string} googleSheetId - Google Sheet ID。
 * @returns {Promise<Object>} - 包含生成結果的物件。
 */
async function processAvatar(guestData, googleSheetId) {
    const guestName = guestData['姓名'] || `未知賓客`;
    const rowIndex = guestData._rowIndex;
    const sessionId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const tempDirPath = path.join(TEMP_DIR, `session_${sessionId}`);
    ensureDirExists(tempDirPath); // 確保此會話的暫存目錄存在

    try {
        console.log(`[DEBUG_CHECK] 賓客 '${guestName}' (原始索引: ${rowIndex}):`);
        const photoUrl = guestData['photo_url'];
        const blessingText = guestData['blessing'];
        const audioUrl = guestData['上傳語音檔'];

        console.log(`[DEBUG_CHECK]   照片 URL: '${photoUrl}' (長度: ${photoUrl ? photoUrl.length : 0})`);
        console.log(`[DEBUG_CHECK]   祝福語: '${blessingText ? blessingText.substring(0, 100) : ''}...' (長度: ${blessingText ? blessingText.length : 0})`);
        console.log(`[DEBUG_CHECK]   音訊 URL: '${audioUrl}' (長度: ${audioUrl ? audioUrl.length : 0})`);

        if (!photoUrl || !photoUrl.startsWith('http')) {
            const message = `照片 URL 缺失或無效，無法生成影片。URL 值: '${photoUrl}'`;
            console.log(`跳過賓客: ${guestName} (原始索引: ${rowIndex}) - ${message}`);
            await updateGoogleSheetCell(googleSheetId, 'status', rowIndex, 'video_failed');
            return { index: rowIndex, success: false, message: `跳過處理: ${message}` };
        }

        let finalAudioPath;
        // 關鍵修正：優先使用 AI 生成的祝福語進行語音合成
        if (blessingText && blessingText.trim() !== '') {
            console.log(`優先使用 AI 生成的祝福語為賓客 '${guestName}' 合成音訊。`);
            try {
                const audioContent = await generateAudioFromText(blessingText);
                const generatedAudioPath = path.join(tempDirPath, `generated_blessing_audio_${sessionId}.mp3`);
                fs.writeFileSync(generatedAudioPath, audioContent, 'binary');
                finalAudioPath = generatedAudioPath;
            } catch (ttsError) {
                console.warn(`AI 祝福語合成失敗為賓客 '${guestName}': ${ttsError.message}。嘗試使用原始上傳語音檔。`);
                // 如果 AI 祝福語合成失敗，回退到使用原始上傳語音檔
                if (audioUrl && audioUrl.startsWith('http')) {
                    const audioExtension = path.extname(audioUrl).split('?')[0] || '.mp3';
                    const downloadedAudioPath = path.join(tempDirPath, `downloaded_audio_${sessionId}${audioExtension}`);
                    try {
                        await downloadGoogleDriveFile(audioUrl, downloadedAudioPath);
                        finalAudioPath = downloadedAudioPath;
                        console.log(`回退到使用下載的原始語音檔: ${finalAudioPath}`);
                    } catch (downloadError) {
                        console.warn(`下載賓客 '${guestName}' 的原始語音檔也失敗: ${downloadError.message}。`);
                        throw new Error('既無 AI 祝福語合成成功也無原始語音檔可用，無法生成影片。');
                    }
                } else {
                    throw new Error('AI 祝福語合成失敗，且無原始語音檔可用。');
                }
            }
        } else if (audioUrl && audioUrl.startsWith('http')) {
            // 如果沒有 AI 祝福語，則嘗試下載上傳的語音檔
            console.log(`無 AI 祝福語，直接下載上傳的語音檔為賓客 '${guestName}'。`);
            const audioExtension = path.extname(audioUrl).split('?')[0] || '.mp3';
            const downloadedAudioPath = path.join(tempDirPath, `downloaded_audio_${sessionId}${audioExtension}`);
            try {
                await downloadGoogleDriveFile(audioUrl, downloadedAudioPath);
                finalAudioPath = downloadedAudioPath;
            } catch (downloadError) {
                console.warn(`下載賓客 '${guestName}' 的語音檔失敗: ${downloadError.message}。`);
                throw new Error('語音檔下載失敗，且無 AI 祝福語可用。');
            }
        } else {
            // 如果兩者都沒有
            const message = '既無上傳語音檔也無 AI 祝福語，無法生成影片。';
            console.log(`跳過賓客: ${guestName} (原始索引: ${rowIndex}) - ${message}`);
            await updateGoogleSheetCell(googleSheetId, 'status', rowIndex, 'video_failed');
            return { index: rowIndex, success: false, message: `跳過處理: ${message}` };
        }

        // 下載並處理臉部圖像
        const faceExtension = path.extname(photoUrl).split('?')[0] || '.jpg';
        const downloadedRawFacePath = path.join(tempDirPath, `face_raw_${sessionId}${faceExtension}`);
        await downloadGoogleDriveFile(photoUrl, downloadedRawFacePath);

        const faceImageBuffer = fs.readFileSync(downloadedRawFacePath);
        const processedFacePath = path.join(tempDirPath, `face_${sessionId}.jpg`);
        await processAndSaveImage(faceImageBuffer, processedFacePath);

        // 確保檔案名稱在 Google Drive 中是有效的，並移除特殊字元
        const outputVideoFileName = `avatar_${guestName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')}_${sessionId}.mp4`;
        const outputVideoPath = path.join(tempDirPath, outputVideoFileName);

        const generatedVideoLocalPath = await generateWav2LipVideo(processedFacePath, finalAudioPath, outputVideoPath, tempDirPath);

        // 關鍵修正：將生成的影片上傳到 Google Drive
        let finalVideoUrl = '';
        let uploadSuccess = false;

        if (GOOGLE_DRIVE_FOLDER_ID) {
            try {
                finalVideoUrl = await uploadFileToGoogleDrive(generatedVideoLocalPath, outputVideoFileName, 'video/mp4');
                uploadSuccess = true;
                console.log(`影片成功上傳至 Google Drive: ${finalVideoUrl}`);
            } catch (uploadError) {
                console.error(`影片上傳到 Google Drive 失敗，將在 Google Sheet 中記錄失敗狀態:`, uploadError.message);
                finalVideoUrl = '上傳失敗'; // 標記上傳失敗
            }
        } else {
            console.warn("未設定 GOOGLE_DRIVE_FOLDER_ID，影片將不會上傳到 Google Drive，且 Google Sheet 中將記錄本地路徑。");
            finalVideoUrl = generatedVideoLocalPath; // 保持本地路徑（無法在瀏覽器中直接存取）
        }

        // 根據上傳結果更新狀態
        const status = uploadSuccess ? 'video_generated' : 'video_upload_failed';
        await updateGoogleSheetCell(googleSheetId, 'AI生成影片網址', rowIndex, finalVideoUrl);
        await updateGoogleSheetCell(googleSheetId, 'status', rowIndex, status);

        return { index: rowIndex, success: uploadSuccess, videoUrl: finalVideoUrl, message: uploadSuccess ? '影片生成與上傳成功' : `影片生成成功但上傳失敗: ${finalVideoUrl}` };

    } catch (error) {
        console.error(`處理賓客 '${guestName}' (原始索引: ${rowIndex}) 的 AI 影片生成失敗:`, error);
        await updateGoogleSheetCell(googleSheetId, 'status', rowIndex, 'video_failed');
        return { index: rowIndex, success: false, message: `影片生成失敗: ${error.message}` };
    } finally {
        // 在調試完成且確定檔案已上傳後，取消註解此行以清理本地臨時檔案
        // cleanupTempFiles(tempDirPath);
    }
}


/**
 * 處理多位賓客的 AI 影片生成流程。
 * @param {Array<number>} guestIndexes - 要處理的賓客索引陣列。
 * @returns {Promise<Object>} - 處理結果摘要。
 */
async function processAvatars(selectedGuestIndexes) {
    console.log('開始為選定的賓客生成 AI 影片...');
    const allGuests = await readGoogleSheet(GOOGLE_SHEET_ID, '表單回應 1!A:Z');

    if (!allGuests || allGuests.length === 0) {
        return { success: false, message: 'Google Sheet 中沒有可供處理的賓客數據。' };
    }

    const guestsToProcess = allGuests.filter(guest =>
        selectedGuestIndexes.includes(guest._rowIndex)
    );

    console.log('從 Google Sheet 讀取到的所有賓客數據 (processAvatars - 截斷顯示):', JSON.stringify(guestsToProcess));

    if (guestsToProcess.length === 0) {
        return { success: false, message: '未找到選定的賓客數據。' };
    }

    const results = [];
    for (const guest of guestsToProcess) {
        const result = await processAvatar(guest, GOOGLE_SHEET_ID);
        results.push(result);
    }

    console.log('AI 影片生成過程完成。已處理', results.filter(r => r.success).length, '位賓客。');
    return { success: true, processedCount: results.filter(r => r.success).length, results: results };
}


module.exports = { processAvatars };
