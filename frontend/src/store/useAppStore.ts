import { create } from 'zustand'
import type { UploadedFile, ParsedFile, SchemaAnalysisResult } from '@/types'

interface AppState {
  // 文件状态
  uploadedFiles: UploadedFile[]
  currentFile: ParsedFile | null
  loading: boolean

  // Schema状态
  schemaResult: SchemaAnalysisResult | null

  // 操作方法
  setUploadedFiles: (files: UploadedFile[]) => void
  addUploadedFile: (file: UploadedFile) => void
  setCurrentFile: (file: ParsedFile | null) => void
  setLoading: (loading: boolean) => void
  setSchemaResult: (result: SchemaAnalysisResult | null) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // 初始状态
  uploadedFiles: [],
  currentFile: null,
  loading: false,
  schemaResult: null,

  // 操作方法
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  addUploadedFile: (file) =>
    set((state) => ({
      uploadedFiles: [file, ...state.uploadedFiles],
    })),
  setCurrentFile: (file) => set({ currentFile: file }),
  setLoading: (loading) => set({ loading }),
  setSchemaResult: (result) => set({ schemaResult: result }),
  reset: () =>
    set({
      uploadedFiles: [],
      currentFile: null,
      loading: false,
      schemaResult: null,
    }),
}))

