'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowRight, Download, Loader2, Upload, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import JSZip from 'jszip'

export default function ResourcePackMerger() {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [merging, setMerging] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const mergedZipRef = useRef<Blob | null>(null)
  const fileInputRef1 = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)

  const addLog = (message: string) => {
    setLog(prev => [...prev, message])
  }

  const handleFileChange = (file: File | null, fileNumber: number) => {
    if (file) {
      if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        if (fileNumber === 1) setFile1(file)
        else setFile2(file)
        addLog(`Selected ${file.name}`)
      } else {
        addLog(`Invalid file type for ${file.name}. Please select a .zip file.`)
      }
    }
  }

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>, fileNumber: number) => {
    event.preventDefault()
    event.stopPropagation()
    const file = event.dataTransfer.files[0]
    if (file) {
      handleFileChange(file, fileNumber)
    }
  }, [])

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const mergeFiles = async (rp1File: JSZip.JSZipObject, rp2File: JSZip.JSZipObject, result: JSZip, relativePath: string, fileName: string) => {
    const [content1, content2] = await Promise.all([rp1File.async('string'), rp2File.async('string')])
    
    let rp1Parsed: Record<string, unknown> = {}
    let rp2Parsed: Record<string, unknown> = {}

    try {
      rp1Parsed = JSON.parse(content1)
    } catch (error) {
      addLog(`Error reading file from RP1: ${fileName}`)
      console.error('Error parsing RP1:', error)
      return
    }

    try {
      rp2Parsed = JSON.parse(content2)
    } catch (error) {
      addLog(`Error reading file from RP2: ${fileName}`)
      console.error('Error parsing RP2:', error)
      return
    }

    if (fileName === 'assets/minecraft/sounds.json') {
      for (const key in rp2Parsed) {
        if (rp2Parsed.hasOwnProperty(key) && !rp1Parsed.hasOwnProperty(key)) {
          (rp1Parsed as Record<string, unknown>)[key] = rp2Parsed[key]
        }
      }
    } else if (rp2Parsed.hasOwnProperty('overrides') && rp1Parsed.hasOwnProperty('overrides')) {
      (rp1Parsed['overrides'] as unknown[]).push(...(rp2Parsed['overrides'] as unknown[]))
    }

    const resultFile = JSON.stringify(rp1Parsed, null, 2)
    result.file(relativePath, resultFile)
  }

  const handleMerge = async () => {
    if (!file1 || !file2) {
      addLog('Please select both resource packs')
      return
    }

    setMerging(true)
    addLog('Starting merge process...')

    try {
      const [zip1, zip2] = await Promise.all([
        JSZip.loadAsync(file1),
        JSZip.loadAsync(file2)
      ])

      const result = new JSZip()
      const outputFolders: Record<string, boolean> = {}

      zip1.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) {
          outputFolders[relativePath] = true
          result.folder(relativePath)
        } else {
          const zip2File = zip2.file(zipEntry.name)
          if (zip2File && zipEntry.name.endsWith('.json')) {
            mergeFiles(zipEntry, zip2File, result, relativePath, zipEntry.name)
          } else {
            result.file(relativePath, zipEntry.async('blob'))
          }
        }
      })

      zip2.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir && !outputFolders[relativePath]) {
          result.folder(relativePath)
        } else if (!zip1.file(zipEntry.name)) {
          result.file(relativePath, zipEntry.async('blob'))
        }
      })

      const mergedContent = await result.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9
        }
      }, (metadata) => {
        setProgress(metadata.percent)
      })

      mergedZipRef.current = mergedContent
      addLog('Merge complete!')
    } catch (error: unknown) {
      if (error instanceof Error) {
        addLog(`Error during merge: ${error.message}`)
      } else {
        addLog('An unknown error occurred during the merge process')
      }
    } finally {
      setMerging(false)
    }
  }

  const handleDownload = () => {
    if (mergedZipRef.current) {
      const url = URL.createObjectURL(mergedZipRef.current)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged-resource-pack.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addLog('Download started!')
    } else {
      addLog('No merged pack available for download')
    }
  }

  const FileUploadArea = ({ fileNumber, file, onDrop, onDragOver }: { fileNumber: number, file: File | null, onDrop: (event: React.DragEvent<HTMLDivElement>, fileNumber: number) => void, onDragOver: (event: React.DragEvent<HTMLDivElement>) => void }) => (
    <div
      className={`
        border border-gray-300 rounded-md p-6 text-center cursor-pointer
        transition-all duration-200 ease-in-out
        hover:border-gray-400 hover:bg-gray-50
      `}
      onDrop={(e) => onDrop(e, fileNumber)}
      onDragOver={onDragOver}
      onClick={() => fileNumber === 1 ? fileInputRef1.current?.click() : fileInputRef2.current?.click()}
    >
      {file ? (
        <p className="text-sm text-gray-600">{file.name}</p>
      ) : (
        <>
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Drag and drop a resource pack here, or click to select</p>
        </>
      )}
      <input
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] || null, fileNumber)}
        ref={fileNumber === 1 ? fileInputRef1 : fileInputRef2}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#e8f2ff] p-8">
      <Card className="max-w-2xl mx-auto bg-white shadow-lg relative">
        <div className="absolute top-4 right-4">
          <a
            href="https://github.com/naimur0w0/MCResourcePackMerger"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="View source on GitHub"
          >
            <Github className="w-6 h-6" />
          </a>
        </div>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Resource Pack Merger</CardTitle>
          <CardDescription>Select and merge your Minecraft resource packs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Resource Pack 1</label>
              <FileUploadArea fileNumber={1} file={file1} onDrop={onDrop} onDragOver={onDragOver} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Resource Pack 2</label>
              <FileUploadArea fileNumber={2} file={file2} onDrop={onDrop} onDragOver={onDragOver} />
            </div>
          </div>

          <Button 
            onClick={handleMerge} 
            disabled={!file1 || !file2 || merging}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {merging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                Merge Packs
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-gray-600">{progress.toFixed(2)}% Complete</p>
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Log</h3>
            <div className="bg-gray-100 rounded-md p-4 h-40 overflow-y-auto">
              {log.map((entry, index) => (
                <p key={index} className="text-sm text-gray-600">{entry}</p>
              ))}
            </div>
          </div>

          {!merging && mergedZipRef.current && (
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Merged Pack
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}