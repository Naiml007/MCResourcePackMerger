'use client'

import { useState, useRef } from 'react'
import { Upload, ArrowRight, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import JSZip from 'jszip'

export default function ResourcePackMerger() {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [merging, setMerging] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const mergedZipRef = useRef<Blob | null>(null)

  const addLog = (message: string) => {
    setLog(prev => [...prev, message])
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileNumber: number) => {
    const file = event.target.files?.[0]
    if (file) {
      if (fileNumber === 1) setFile1(file)
      else setFile2(file)
      addLog(`Selected ${file.name}`)
    }
  }

  const mergeFiles = async (rp1File: JSZip.JSZipObject, rp2File: JSZip.JSZipObject, result: JSZip, relativePath: string, fileName: string) => {
    const [content1, content2] = await Promise.all([rp1File.async('string'), rp2File.async('string')])
    
    let rp1Parsed = {}
    let rp2Parsed = {}

    try {
      rp1Parsed = JSON.parse(content1)
    } catch (error) {
      addLog(`Error reading file from RP1: ${fileName}`)
      return
    }

    try {
      rp2Parsed = JSON.parse(content2)
    } catch (error) {
      addLog(`Error reading file from RP2: ${fileName}`)
      return
    }

    if (fileName === 'assets/minecraft/sounds.json') {
      for (let key in rp2Parsed) {
        if (rp2Parsed.hasOwnProperty(key) && !rp1Parsed.hasOwnProperty(key)) {
          rp1Parsed[key] = rp2Parsed[key]
        }
      }
    } else if (rp2Parsed.hasOwnProperty('overrides') && rp1Parsed.hasOwnProperty('overrides')) {
      // Implement the overrides merging logic here
      // This is a simplified version, you may need to add more complex logic as in the original script
      rp1Parsed['overrides'] = [...rp1Parsed['overrides'], ...rp2Parsed['overrides']]
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
    } catch (error) {
      addLog(`Error during merge: ${error.message}`)
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Resource Pack Merger</CardTitle>
          <CardDescription>Select and merge your Minecraft resource packs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="rp1" className="block text-sm font-medium mb-1">Resource Pack 1</label>
              <Input
                id="rp1"
                type="file"
                accept=".zip"
                onChange={(e) => handleFileChange(e, 1)}
                className="cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="rp2" className="block text-sm font-medium mb-1">Resource Pack 2</label>
              <Input
                id="rp2"
                type="file"
                accept=".zip"
                onChange={(e) => handleFileChange(e, 2)}
                className="cursor-pointer"
              />
            </div>
          </div>

          <Button 
            onClick={handleMerge} 
            disabled={!file1 || !file2 || merging}
            className="w-full"
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
              <p className="text-sm text-center">{progress.toFixed(2)}% Complete</p>
            </div>
          )}

          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Log</h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 h-40 overflow-y-auto">
              {log.map((entry, index) => (
                <p key={index} className="text-sm">{entry}</p>
              ))}
            </div>
          </div>

          {!merging && mergedZipRef.current && (
            <Button className="w-full" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Merged Pack
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}