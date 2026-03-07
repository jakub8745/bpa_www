import { useEffect, useMemo, useRef, useState } from 'react'
import './WorkshopForm.css'

const DRIVE_FILE_REGEX = /[-\w]{25,}/
const DRIVE_API_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbyXt3p8sIsxlhbMpdvldmCplAZQJ76g_jHkqtPb4jexUzy05mEQGYEXYetMX_cRUG_u/exec'
const GROUP_SCREENSHOT_FOLDERS = {
  '1': 'https://drive.google.com/drive/folders/1RU-kRleyj8umXRuDMoLvqLca45sWNLsl',
  '2': 'https://drive.google.com/drive/folders/1cPxfHDCfjvEqkXpez90mBiGhKAlfC2hL',
  '3': 'https://drive.google.com/drive/folders/1ysjJt8v2m7G0H8VGgF3suluze3mAd1jm',
  '4': 'https://drive.google.com/drive/folders/1bneabvSQwQQ3KPtcFiG-1D_Dgoo_1_51',
  '5': 'https://drive.google.com/drive/folders/1sGVFJyYHxe8qBQqXMg6YcCue_W6CdB1d'
}
const GROUP_HISTORY_FOLDERS = {
  '1': 'https://drive.google.com/drive/folders/1SPQ2rRQFJNQrf8D-K0WEosedeQSYRVOW',
  '2': 'https://drive.google.com/drive/folders/1sOhqk2AOVqGUrIXFo3b-TzP-pRBZkw2S',
  '3': 'https://drive.google.com/drive/folders/1DDPYBgVbUa9vDWQ7_TkvZBhbLXGVd_Ad',
  '4': 'https://drive.google.com/drive/folders/1sb8zuP4Aul9fENPZLGMWUWckdc79kkjL',
  '5': 'https://drive.google.com/drive/folders/1ZQvLKyQDvO6jitKBpp4exIBzTVnwWLEI'
}

const DEFAULT_PROMPT_1 = 'Podaj interpretację emocjonalną tego screenshotu (do 150 wyrazów).'
const DEFAULT_PROMPT_2 = 'Opisz historię tego, co widzisz na tym screenshocie (do 150 wyrazów).'
const GROUP_NOTE = 'GRUPA: 1/2/3/4/5 (zaznacz odpowiednie). Nazwa grupy (opcjonalnie) / afiliacja.'
const SCREENSHOT_NOTE =
  'Etapy pracy: wybór screenshota → wklejenie do ChatGPT → pierwszy prompt → odpowiedź AI → drugi prompt → druga odpowiedź AI → wybór fragmentów → BANK TEKSTU'
const CHATGPT_NOTE =
  'Otwórz ChatGPT w osobnym oknie przeglądarki. Skopiuj wybrany screenshot z ramki powyżej i wklej go do okna czatu. Następnie wpisz poniższe prompty. Pełne odpowiedzi AI zanotuj i wklej w odpowiednie miejsca formularza.'
const FRAGMENTS_NOTE = 'Przeczytajcie uważnie tekst wygenerowany przez AI. W tekście poszukujcie słów, fraz, znaków lub zdań, które najbardziej przyciągają Waszą uwagę. Mogą to być fragmenty mocne, zaskakujące, niepokojące, zbyt dosłowne albo takie, które otwierają nowy kierunek interpretacji. Wybierajcie to, co zatrzymuje uwagę, budzi napięcie, brzmi nieoczywiście albo pobudza wyobraźnię.'
const TEXTBANK_NOTE = 'Wpiszcie tutaj wybrane fragmenty tekstu AI. Ułóżcie je jako materiał do dalszej pracy nad warstwą słowną wideopoematu.'
const AUTOSAVE_INTERVAL_MS = 180_000
const FILE_NAME_REGEX = /^s(\d+)_(\d+)_/

function pad2(value) {
  return String(value).padStart(2, '0')
}

function getNextVersionForScreenshot(files, screenshotNumber) {
  const maxVersion = (files || []).reduce((max, file) => {
    const match = String(file?.name || '').match(FILE_NAME_REGEX)
    if (!match) return max

    const savedScreenshot = Number.parseInt(match[1], 10)
    const savedVersion = Number.parseInt(match[2], 10)
    if (Number.isNaN(savedScreenshot) || Number.isNaN(savedVersion)) return max
    if (savedScreenshot !== screenshotNumber) return max

    return Math.max(max, savedVersion)
  }, 0)

  return maxVersion + 1
}

function toDirectDriveImageUrl(input) {
  if (!input) return ''

  if (/^https?:\/\//i.test(input) && !input.includes('drive.google.com')) {
    return input
  }

  const byId = input.match(/[?&]id=([-\w]{25,})/)
  if (byId) return `https://drive.google.com/thumbnail?id=${byId[1]}&sz=w1600`

  const byFilePath = input.match(/\/d\/([-\w]{25,})/)
  if (byFilePath) return `https://drive.google.com/thumbnail?id=${byFilePath[1]}&sz=w1600`

  const rawId = input.match(DRIVE_FILE_REGEX)
  if (rawId) return `https://drive.google.com/thumbnail?id=${rawId[0]}&sz=w1600`

  return ''
}

function normalizeDriveFolderUrl(input) {
  const match = input.match(DRIVE_FILE_REGEX)
  if (!match) return ''
  return `https://drive.google.com/drive/folders/${match[0]}`
}

function extractDriveFileId(input) {
  if (!input) return ''

  const byId = input.match(/[?&]id=([-\w]{25,})/)
  if (byId) return byId[1]

  const byFilePath = input.match(/\/d\/([-\w]{25,})/)
  if (byFilePath) return byFilePath[1]

  const rawId = input.match(DRIVE_FILE_REGEX)
  return rawId ? rawId[0] : ''
}

function buildDriveImageSources(fileId) {
  if (!fileId) return []
  return [
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1600`
  ]
}

function PreviewImage({ image, alt }) {
  const fallbackUrls = image?.fallbackUrls || []
  const [src, setSrc] = useState(image?.url || '')
  const [fallbackIndex, setFallbackIndex] = useState(0)

  useEffect(() => {
    setSrc(image?.url || '')
    setFallbackIndex(0)
  }, [image?.id, image?.url])

  function handleError() {
    if (fallbackIndex >= fallbackUrls.length) return
    setSrc(fallbackUrls[fallbackIndex])
    setFallbackIndex((prev) => prev + 1)
  }

  return <img className="preview" src={src} alt={alt} onError={handleError} referrerPolicy="no-referrer" />
}

function DriveThumb({ image, alt }) {
  const fallbackUrls = image?.fallbackUrls || []
  const [src, setSrc] = useState(image?.url || '')
  const [fallbackIndex, setFallbackIndex] = useState(0)

  useEffect(() => {
    setSrc(image?.url || '')
    setFallbackIndex(0)
  }, [image?.id, image?.url])

  function handleError() {
    if (fallbackIndex >= fallbackUrls.length) return
    setSrc(fallbackUrls[fallbackIndex])
    setFallbackIndex((prev) => prev + 1)
  }

  return <img className="drive-thumb" src={src} alt={alt} onError={handleError} referrerPolicy="no-referrer" />
}

function makeEntry(group) {
  return {
    id: `entry-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    screenshotDescription: '',
    screenshotSource: 'drive',
    screenshotImage: null,
    driveFolderUrl: GROUP_SCREENSHOT_FOLDERS[group] || GROUP_SCREENSHOT_FOLDERS['1'],
    driveImages: [],
    driveStatus: '',
    prompt1: DEFAULT_PROMPT_1,
    answer1: '',
    prompt2: DEFAULT_PROMPT_2,
    answer2: ''
  }
}

function normalizeLoadedEntry(rawEntry, group) {
  return {
    id: `entry-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    screenshotDescription: rawEntry?.screenshotDescription || '',
    screenshotSource: 'drive',
    screenshotImage: rawEntry?.screenshotImage || null,
    driveFolderUrl: GROUP_SCREENSHOT_FOLDERS[group] || GROUP_SCREENSHOT_FOLDERS['1'],
    driveImages: [],
    driveStatus: '',
    prompt1: rawEntry?.prompt1 || DEFAULT_PROMPT_1,
    answer1: rawEntry?.answer1 || '',
    prompt2: rawEntry?.prompt2 || DEFAULT_PROMPT_2,
    answer2: rawEntry?.answer2 || ''
  }
}

function makeEmptyFormData(group) {
  return {
    group,
    groupName: '',
    affiliation: '',
    participants: '',
    scanNumber: '',
    textBank: ''
  }
}

function WorkshopForm() {
  const saveToken = ''
  const hasMountedRef = useRef(false)
  const [formData, setFormData] = useState({
    group: '1',
    groupName: '',
    affiliation: '',
    participants: '',
    scanNumber: '',
    textBank: ''
  })

  const [entries, setEntries] = useState([makeEntry('1')])
  const [saveStatus, setSaveStatus] = useState('')
  const [saveFileUrl, setSaveFileUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState('')
  const [cloudFiles, setCloudFiles] = useState([])
  const [cloudStatus, setCloudStatus] = useState('')
  const [isCloudBusy, setIsCloudBusy] = useState(false)

  useEffect(() => {
    const nextFolder = GROUP_SCREENSHOT_FOLDERS[formData.group] || GROUP_SCREENSHOT_FOLDERS['1']
    setEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        driveFolderUrl: nextFolder,
        driveImages: [],
        driveStatus: ''
      }))
    )
    setCloudFiles([])
    setCloudStatus('')
  }, [formData.group])

  function updateField(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function updateEntry(entryId, updates) {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry))
    )
  }

  function handleComputerFileChange(entryId, event) {
    const file = event.target.files?.[0]
    if (!file) return

    updateEntry(entryId, {
      screenshotImage: {
        id: `local-${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file)
      }
    })

    event.target.value = ''
  }

  async function fetchImagesFromDriveFolder(entryId) {
    const entry = entries.find((item) => item.id === entryId)
    if (!entry) return

    const normalizedFolderUrl = normalizeDriveFolderUrl(entry.driveFolderUrl)

    if (!normalizedFolderUrl) {
      updateEntry(entryId, { driveStatus: 'Podaj poprawny link folderu Google Drive.' })
      return
    }

    try {
      updateEntry(entryId, { driveStatus: 'Pobieranie obrazów z folderu...' })

      const response = await fetch(
        `${DRIVE_API_EXEC_URL}?folderUrl=${encodeURIComponent(normalizedFolderUrl)}`
      )

      if (!response.ok) {
        throw new Error(`Błąd API: ${response.status}`)
      }

      const payload = await response.json()
      const parsed = (payload.images || [])
        .map((item, index) => {
          const sourceInput = item.url || item.id || ''
          const url = toDirectDriveImageUrl(sourceInput)
          if (!url) return null

          const fileId = extractDriveFileId(sourceInput)
          const fallbacks = buildDriveImageSources(fileId).filter((candidate) => candidate !== url)

          return {
            id: item.id || `${Date.now()}-${index}`,
            name: item.name || `Obraz ${index + 1}`,
            url,
            fallbackUrls: fallbacks
          }
        })
        .filter(Boolean)

      updateEntry(entryId, {
        driveImages: parsed,
        driveStatus: `Znaleziono ${parsed.length} obraz(ów). Wybierz jeden.`
      })
    } catch (error) {
      updateEntry(entryId, { driveStatus: `Nie udało się pobrać obrazów: ${error.message}` })
    }
  }

  function assignDriveImage(entryId, image) {
    updateEntry(entryId, { screenshotImage: image })
  }

  function removeEntry(entryId) {
    setEntries((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((entry) => entry.id !== entryId)
    })
  }

  function addEntry() {
    setEntries((prev) => [...prev, makeEntry(formData.group)])
  }

  const exportedData = useMemo(
    () => ({
      ...formData,
      screenshotEntries: entries.map((entry) => ({
        screenshotDescription: entry.screenshotDescription,
        screenshotSource: entry.screenshotSource,
        screenshotImage: entry.screenshotImage,
        driveFolderUrl: normalizeDriveFolderUrl(entry.driveFolderUrl),
        prompt1: entry.prompt1,
        answer1: entry.answer1,
        prompt2: entry.prompt2,
        answer2: entry.answer2
      })),
      driveApiExecUrl: DRIVE_API_EXEC_URL
    }),
    [formData, entries]
  )

  async function handleSaveJson(options = {}) {
    const { silent = false, reason = 'manual' } = options
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const parsedScanNumber = Number.parseInt(String(formData.scanNumber || ''), 10)
    const screenshotNumber = Number.isNaN(parsedScanNumber) || parsedScanNumber < 1 ? 1 : parsedScanNumber
    const versionNumber = getNextVersionForScreenshot(cloudFiles, screenshotNumber)
    const fileName = `s${pad2(screenshotNumber)}_${pad2(versionNumber)}_${timestamp}.json`
    const historyFolderUrl = GROUP_HISTORY_FOLDERS[formData.group] || GROUP_HISTORY_FOLDERS['1']
    const historyFolderId = extractDriveFileId(historyFolderUrl)

    try {
      setIsSaving(true)
      if (!silent) setSaveStatus('Zapisywanie JSON do Google Drive...')
      setSaveFileUrl('')

      const response = await fetch(DRIVE_API_EXEC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'save_json',
          token: saveToken,
          group: formData.group,
          folderUrl: historyFolderUrl,
          folderId: historyFolderId,
          groupFolderId: historyFolderId,
          fileName,
          payload: exportedData
        })
      })

      if (!response.ok) {
        throw new Error(`Błąd API: ${response.status}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.ok) {
        throw new Error('API nie potwierdziło zapisu.')
      }

      if (reason === 'autosave') {
        setLastAutoSaveAt(new Date().toLocaleTimeString())
      } else {
        setSaveStatus(`Zapisano: ${result.fileName || fileName}`)
      }
      setSaveFileUrl(result.fileUrl || '')
      fetchSavedJsonListFromDrive({ silent: true })
    } catch (error) {
      setSaveStatus(`Nie udało się zapisać: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  function applyLoadedPayload(parsed, sourceLabel, options = {}) {
  const { forcedGroup = '' } = options
  const loadedGroup = String(parsed.group || '1')
  const preferredGroup = String(forcedGroup || loadedGroup || '1')
  const validGroup = GROUP_HISTORY_FOLDERS[preferredGroup] ? preferredGroup : '1'

    setFormData({
      group: validGroup,
      groupName: parsed.groupName || '',
      affiliation: parsed.affiliation || '',
      participants: parsed.participants || '',
      scanNumber: parsed.scanNumber || '',
      textBank: parsed.textBank || ''
    })

    const loadedEntries = Array.isArray(parsed.screenshotEntries) ? parsed.screenshotEntries : []
    if (loadedEntries.length > 0) {
      setEntries(loadedEntries.map((entry) => normalizeLoadedEntry(entry, validGroup)))
    } else {
      setEntries([makeEntry(validGroup)])
    }

    setSaveStatus(`Wczytano dane: ${sourceLabel}`)
    setSaveFileUrl('')
  }

  function resetFormForGroup(group) {
    const validGroup = GROUP_HISTORY_FOLDERS[group] ? group : '1'
    setFormData(makeEmptyFormData(validGroup))
    setEntries([makeEntry(validGroup)])
    setSaveStatus('')
    setSaveFileUrl('')
  }

  async function fetchSavedJsonListFromDrive(options = {}) {
    const { silent = false } = options
    const historyFolderUrl = GROUP_HISTORY_FOLDERS[formData.group] || GROUP_HISTORY_FOLDERS['1']
    const historyFolderId = extractDriveFileId(historyFolderUrl)
    try {
      setIsCloudBusy(true)
      if (!silent) setCloudStatus('Pobieranie listy zapisanych plików...')

      const query = new URLSearchParams({
        action: 'list_json',
        group: formData.group,
        folderUrl: historyFolderUrl,
        folderId: historyFolderId,
        groupFolderId: historyFolderId,
        token: saveToken
      })
      const response = await fetch(`${DRIVE_API_EXEC_URL}?${query.toString()}`)

      if (!response.ok) throw new Error(`Błąd API: ${response.status}`)
      const result = await response.json()
      if (result.error) throw new Error(result.error)
      if (!result.ok) throw new Error('API nie zwróciło listy plików.')

      const files = Array.isArray(result.files) ? result.files : []
      setCloudFiles(files)
      if (!silent) {
        setCloudStatus(`Znaleziono ${files.length} plik(ów) JSON w folderze grupy ${formData.group}.`)
      }
    } catch (error) {
      setCloudFiles([])
      if (!silent) setCloudStatus(`Nie udało się pobrać listy: ${error.message}`)
    } finally {
      setIsCloudBusy(false)
    }
  }

  async function loadLatestJsonFromDrive(options = {}) {
    const { silent = false } = options
    const historyFolderUrl = GROUP_HISTORY_FOLDERS[formData.group] || GROUP_HISTORY_FOLDERS['1']
    const historyFolderId = extractDriveFileId(historyFolderUrl)
    try {
      setIsCloudBusy(true)
      if (!silent) setCloudStatus('Wczytywanie ostatniej wersji z Google Drive...')

      const listQuery = new URLSearchParams({
        action: 'list_json',
        group: formData.group,
        folderUrl: historyFolderUrl,
        folderId: historyFolderId,
        groupFolderId: historyFolderId,
        token: saveToken
      })
      const listResponse = await fetch(`${DRIVE_API_EXEC_URL}?${listQuery.toString()}`)
      if (!listResponse.ok) throw new Error(`Błąd API: ${listResponse.status}`)
      const listResult = await listResponse.json()
      if (listResult.error) throw new Error(listResult.error)
      if (!listResult.ok) throw new Error('API nie zwróciło listy plików.')

      const files = Array.isArray(listResult.files) ? listResult.files : []
      setCloudFiles(files)
      if (files.length === 0) {
        resetFormForGroup(formData.group)
        if (!silent) {
          setCloudStatus(`Brak zapisanych plików JSON w folderze grupy ${formData.group}.`)
        }
        return
      }

      const latestFileId = files[0].id

      const query = new URLSearchParams({
        action: 'load_json',
        group: formData.group,
        folderUrl: historyFolderUrl,
        folderId: historyFolderId,
        groupFolderId: historyFolderId,
        fileId: latestFileId,
        token: saveToken
      })
      const response = await fetch(`${DRIVE_API_EXEC_URL}?${query.toString()}`)

      if (!response.ok) throw new Error(`Błąd API: ${response.status}`)
      const result = await response.json()
      if (result.error) throw new Error(result.error)
      if (!result.ok || !result.payload) throw new Error('API nie zwróciło danych pliku.')

      applyLoadedPayload(result.payload, result.fileName || 'plik z Google Drive', {
        forcedGroup: formData.group
      })
      if (!silent) {
        setCloudStatus(`Wczytano ostatnią wersję: ${result.fileName || latestFileId}`)
      }
    } catch (error) {
      if (!silent) {
        setCloudStatus(`Nie udało się wczytać z Google Drive: ${error.message}`)
      }
    } finally {
      setIsCloudBusy(false)
    }
  }

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      void loadLatestJsonFromDrive({ silent: true })
      return
    }

    void loadLatestJsonFromDrive({ silent: true })
  }, [formData.group, saveToken])

  useEffect(() => {
    const timer = setInterval(() => {
      if (isSaving) return
      void handleSaveJson({ silent: true, reason: 'autosave' })
    }, AUTOSAVE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [isSaving, formData.group, saveToken, exportedData])

  return (
    <main className="workshop-form page">
      <img
        className="form-header-image"
        src="/images/posts/vectai_formularz_naglowek.jpg"
        alt="Nagłówek formularza"
      />
      <h1>Template warsztatowy</h1>
      <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
        <section className="card">
          <h2>Dane grupy</h2>
          <p className="section-note">{GROUP_NOTE}</p>
          <div className="row group-options">
            <label className="group-label">Grupa:</label>
            <label className="group-option">
              <input type="radio" name="group" value="1" checked={formData.group === '1'} onChange={updateField} />
              <span>1</span>
            </label>
            <label className="group-option">
              <input type="radio" name="group" value="2" checked={formData.group === '2'} onChange={updateField} />
              <span>2</span>
            </label>
            <label className="group-option">
              <input type="radio" name="group" value="3" checked={formData.group === '3'} onChange={updateField} />
              <span>3</span>
            </label>
            <label className="group-option">
              <input type="radio" name="group" value="4" checked={formData.group === '4'} onChange={updateField} />
              <span>4</span>
            </label>
            <label className="group-option">
              <input type="radio" name="group" value="5" checked={formData.group === '5'} onChange={updateField} />
              <span>5</span>
            </label>
          </div>
          <label>
            Nazwa grupy (opcjonalnie)
            <input name="groupName" value={formData.groupName} onChange={updateField} />
          </label>
          <label>
            Afiliacja
            <input name="affiliation" value={formData.affiliation} onChange={updateField} />
          </label>
          <label>
            Nazwiska uczestników grupy
            <textarea name="participants" rows="3" value={formData.participants} onChange={updateField} />
          </label>

        </section>

        <section className="card">
          {entries.map((entry, index) => (
            <article className="chatgpt-entry" key={entry.id}>
              <h3>MODEL 3D nr 1 (KIRI Engine)</h3>
              <p className="section-note">{SCREENSHOT_NOTE}</p><br/>

              <article className="slot-card single-slot">
                <h3>Screenshot {index + 1}</h3>
                <div className="drive-picker">

                  <button type="button" onClick={() => fetchImagesFromDriveFolder(entry.id)}>
                    Pokaż screenshot-y w folderze
                  </button>

                  {entry.driveImages.length > 0 && !entry.screenshotImage && (
                    <div className="drive-list" role="group" aria-label="Pliki w folderze Google Drive">
                      {entry.driveImages.map((image) => (
                        <div key={image.id} className="drive-item">
                          <div className="drive-item-main">
                            <DriveThumb image={image} alt={image.name} />
                            <span>{image.name}</span>
                          </div>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => assignDriveImage(entry.id, image)}
                          >
                            Wybierz
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {entry.driveStatus && <p className="status">{entry.driveStatus}</p>}
                </div>

                {entry.screenshotImage ? (
                  <>
                    <PreviewImage image={entry.screenshotImage} alt={entry.screenshotImage.name} />
                    <p className="slot-name">{entry.screenshotImage.name}</p>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => updateEntry(entry.id, { screenshotImage: null })}
                    >
                      Usuń obraz
                    </button>
                  </>
                ) : (
                  <p className="slot-empty">Brak obrazu w tym slocie.</p>
                )}
              </article>

              <h3>Praca z ChatGPT - AI</h3>
              <p className="section-note">{CHATGPT_NOTE}</p>

              <label>
                Prompt 1
                <textarea
                  rows="2"
                  value={entry.prompt1}
                  readOnly
                />
              </label>

              <label>
                Odpowiedź AI 1
                <textarea
                  rows="6"
                  value={entry.answer1}
                  onChange={(event) => updateEntry(entry.id, { answer1: event.target.value })}
                />
              </label>

              <label>
                Prompt 2
                <textarea
                  rows="2"
                  value={entry.prompt2}
                  readOnly
                />
              </label>

              <label>
                Odpowiedź AI 2
                <textarea
                  rows="6"
                  value={entry.answer2}
                  onChange={(event) => updateEntry(entry.id, { answer2: event.target.value })}
                />
              </label>

              {entries.length > 1 && (
                <button type="button" className="button-secondary" onClick={() => removeEntry(entry.id)}>
                  Usuń tę sekcję
                </button>
              )}
            </article>
          ))}

          <button type="button" onClick={addEntry}>Dodaj następny screenshot</button>
        </section>

        <section className="card">
          <h2>Poszukiwanie znaczących fragmentów („pęknięć sensu”)</h2>
          <p className="section-note">{FRAGMENTS_NOTE}</p>
          <label>
            <h2>Tworzenie BANKU TEKSTÓW</h2>
          <p className="section-note">{TEXTBANK_NOTE}</p>
            <textarea name="textBank" rows="8" value={formData.textBank} onChange={updateField} />
          </label>
        </section>
      </form>

      <section className="card output">
        <h2>Podgląd danych formularza (JSON)</h2>
        <div className="save-panel">
          <p className="section-note">Autosave co 3 minuty.</p>
          {lastAutoSaveAt && <p className="section-note">Ostatni autosave: {lastAutoSaveAt}</p>}
          <div className="cloud-load-panel">
            <button type="button" className="button-secondary" onClick={loadLatestJsonFromDrive} disabled={isCloudBusy}>
              {isCloudBusy ? 'Łączenie...' : 'Wczytaj ostatnią wersję'}
            </button>
            {cloudStatus && <p className="status">{cloudStatus}</p>}
          </div>
          <button type="button" onClick={handleSaveJson} disabled={isSaving}>
            {isSaving ? 'Zapisywanie...' : 'Zapisz formularz'}
          </button>
          {saveStatus && <p className="status">{saveStatus}</p>}
          {saveFileUrl && (
            <p>
              Plik: <a href={saveFileUrl} target="_blank" rel="noreferrer">otwórz w Google Drive</a>
            </p>
          )}
        </div>
      </section>

      <section className="form-disclaimer" aria-label="Disclaimer projektu CAPHE">
        <p>
          Wydarzenie jest częścią projektu CAPHE, finansowanego przez Unię Europejską w ramach programu Horyzont Europa
          (grant nr 101086391). Poglądy i opinie wyrażone w materiałach należą wyłącznie do autorów i nie odzwierciedlają
          koniecznie stanowiska Unii Europejskiej ani EACEA.
        </p>
      </section>
    </main>
  )
}

export default WorkshopForm
