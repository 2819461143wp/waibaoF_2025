<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { userStore } from '@/stores/user'

const store = userStore()

// 状态管理
const uploadLoading = ref(false)
const selectedFiles = ref([])
const selectedCategory = ref('')
const selectedDataType = ref('')

// 数据分类配置
const dataCategories = {
  production: {
    label: '生产数据',
    types: {
      sensor: { label: '传感器数据', fileTypes: ['.xlsx', '.xls', '.csv'], structured: true },
      mes: { label: 'MES生产记录', fileTypes: ['.xlsx', '.xls', '.csv'], structured: true },
      images: {
        label: '生产图像',
        fileTypes: ['.jpg', '.jpeg', '.png', '.bmp'],
        structured: false,
      },
      logs: { label: '生产日志', fileTypes: ['.txt', '.log'], structured: false },
    },
  },
  maintenance: {
    label: '运维数据',
    types: {
      repair: { label: '维修工单记录', fileTypes: ['.xlsx', '.xls', '.csv'], structured: true },
      inspection: { label: '设备点检日志', fileTypes: ['.xlsx', '.xls', '.csv'], structured: true },
      videos: { label: '维修视频', fileTypes: ['.mp4', '.avi', '.mov'], structured: false },
      documents: { label: '技术文档', fileTypes: ['.pdf', '.doc', '.docx'], structured: false },
    },
  },
  analysis: {
    label: '分析数据',
    types: {
      models: { label: '模型文件', fileTypes: ['.pkl', '.h5', '.pth', '.onnx'], structured: false },
      reports: { label: '分析报告', fileTypes: ['.pdf', '.xlsx', '.pptx'], structured: false },
      datasets: { label: '数据集', fileTypes: ['.csv', '.json', '.parquet'], structured: true },
      scripts: { label: '脚本文件', fileTypes: ['.py', '.r', '.sql'], structured: false },
    },
  },
}

// 计算属性：当前分类的数据类型选项
const currentDataTypes = computed(() => {
  if (!selectedCategory.value) return []
  return Object.entries(dataCategories[selectedCategory.value].types).map(([key, typeInfo]) => ({
    value: key,
    label: typeInfo.label,
    structured: typeInfo.structured,
  }))
})

// 计算属性：当前选择类型的文件格式
const currentAcceptedTypes = computed(() => {
  if (!selectedCategory.value || !selectedDataType.value) return '*'
  const typeInfo = dataCategories[selectedCategory.value].types[selectedDataType.value]
  return typeInfo.fileTypes.join(',')
})

// 计算属性：当前选择类型是否为结构化数据
const isStructuredData = computed(() => {
  if (!selectedCategory.value || !selectedDataType.value) return true
  const typeInfo = dataCategories[selectedCategory.value].types[selectedDataType.value]
  return typeInfo.structured
})

// 计算属性：按大类分组的文件列表
const filesByCategory = computed(() => {
  const grouped = {}
  selectedFiles.value.forEach((file) => {
    if (!grouped[file.category]) {
      grouped[file.category] = []
    }
    grouped[file.category].push(file)
  })
  return grouped
})

// 计算属性：当前大类的文件列表
const currentCategoryFiles = computed(() => {
  if (!selectedCategory.value) return []
  return selectedFiles.value.filter((file) => file.category === selectedCategory.value)
})

// 重置数据类型选择（但保留已选文件）
const resetDataType = () => {
  selectedDataType.value = ''
}

// 处理大类切换
const handleCategoryChange = (newCategory) => {
  // 如果点击的是当前已选择的大类，不做任何操作
  if (selectedCategory.value === newCategory) {
    return
  }

  // 如果有当前大类的文件正在重命名，提示用户
  const renamingFile = selectedFiles.value.find(
    (file) => file.category === selectedCategory.value && file.isRenaming,
  )
  if (renamingFile) {
    ElMessage.warning('请先完成当前文件的重命名操作')
    return
  }

  selectedCategory.value = newCategory
  selectedDataType.value = ''
}

// 处理大类点击事件（无论是否已选中都能切换）
const handleCategoryClick = (categoryKey) => {
  // 如果有当前大类的文件正在重命名，提示用户
  const renamingFile = selectedFiles.value.find(
    (file) => file.category === selectedCategory.value && file.isRenaming,
  )
  if (renamingFile) {
    ElMessage.warning('请先完成当前文件的重命名操作')
    return
  }

  // 直接设置新的大类并重置数据类型
  selectedCategory.value = categoryKey
  selectedDataType.value = ''
}

// 获取文件图标
const getFileIcon = (fileName) => {
  const extension = getFileExtension(fileName)
  const iconMap = {
    // 表格文件
    xlsx: 'document',
    xls: 'document',
    csv: 'document',
    // 图片文件
    jpg: 'picture',
    jpeg: 'picture',
    png: 'picture',
    bmp: 'picture',
    // 视频文件
    mp4: 'video-camera',
    avi: 'video-camera',
    mov: 'video-camera',
    // 文档文件
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    txt: 'document',
    log: 'document',
    // 代码文件
    py: 'edit',
    r: 'edit',
    sql: 'edit',
    // 模型文件
    pkl: 'cpu',
    h5: 'cpu',
    pth: 'cpu',
    onnx: 'cpu',
    // 其他
    json: 'document',
    parquet: 'document',
    pptx: 'document',
  }
  return iconMap[extension] || 'document'
}

// 获取文件类型标签颜色
const getFileTypeColor = (fileName) => {
  const extension = getFileExtension(fileName)
  const colorMap = {
    // 表格文件 - 绿色
    xlsx: 'success',
    xls: 'success',
    csv: 'success',
    // 图片文件 - 蓝色
    jpg: 'primary',
    jpeg: 'primary',
    png: 'primary',
    bmp: 'primary',
    // 视频文件 - 紫色
    mp4: '',
    avi: '',
    mov: '',
    // 文档文件 - 橙色
    pdf: 'warning',
    doc: 'warning',
    docx: 'warning',
    txt: 'info',
    log: 'info',
    // 代码文件 - 深色
    py: 'danger',
    r: 'danger',
    sql: 'danger',
    // 模型文件 - 特殊色
    pkl: '',
    h5: '',
    pth: '',
    onnx: '',
  }
  return colorMap[extension] || 'info'
}

// 文件大小格式化
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 文件选择处理
const handleFileChange = (uploadFile) => {
  if (!selectedCategory.value || !selectedDataType.value) {
    ElMessage.error('请先选择数据分类和类型')
    return
  }

  // 检查文件格式
  const fileExtension = getFileExtension(uploadFile.raw.name)
  const allowedTypes =
    dataCategories[selectedCategory.value].types[selectedDataType.value].fileTypes
  if (!allowedTypes.some((type) => type.toLowerCase() === `.${fileExtension}`)) {
    ElMessage.error(`当前类型只支持以下格式：${allowedTypes.join(', ')}`)
    return
  }

  // 检查文件是否已存在
  const existingFile = selectedFiles.value.find((file) => file.originalName === uploadFile.raw.name)
  if (existingFile) {
    ElMessage.warning('该文件已选择')
    return
  }

  const file = {
    id: Date.now() + Math.random(),
    file: uploadFile.raw,
    originalName: uploadFile.raw.name,
    displayName:
      uploadFile.raw.name.substring(0, uploadFile.raw.name.lastIndexOf('.')) || uploadFile.raw.name,
    size: uploadFile.raw.size,
    category: selectedCategory.value,
    dataType: selectedDataType.value,
    isRenaming: false,
    structured: isStructuredData.value,
  }

  selectedFiles.value.push(file)
  ElMessage.success('文件添加成功')
}

// 删除文件
const removeFile = (fileId) => {
  selectedFiles.value = selectedFiles.value.filter((file) => file.id !== fileId)
}

// 清空指定大类的文件
const clearCategoryFiles = (category) => {
  selectedFiles.value = selectedFiles.value.filter((file) => file.category !== category)
  ElMessage.success(`已清空${dataCategories[category].label}的文件`)
}

// 开始重命名
const startRename = (file) => {
  file.isRenaming = true
  file.tempName = file.displayName
}

// 确认重命名
const confirmRename = (file) => {
  if (!file.tempName.trim()) {
    ElMessage.error('文件名不能为空')
    return
  }
  file.displayName = file.tempName.trim()
  file.isRenaming = false
  ElMessage.success('文件名修改成功')
}

// 取消重命名
const cancelRename = (file) => {
  file.isRenaming = false
  delete file.tempName
}

// 获取文件扩展名
const getFileExtension = (fileName) => {
  return fileName.toLowerCase().split('.').pop()
}

// 获取最终文件名
const getFinalFileName = (file) => {
  const extension = getFileExtension(file.originalName)
  return `${file.displayName}.${extension}`
}

// 批量上传指定大类的文件
const handleCategoryUpload = async (category) => {
  const categoryFiles = selectedFiles.value.filter((file) => file.category === category)

  if (categoryFiles.length === 0) {
    ElMessage.error('该分类下没有文件')
    return
  }

  // 检查是否有文件正在重命名
  const renamingFile = categoryFiles.find((file) => file.isRenaming)
  if (renamingFile) {
    ElMessage.error('请先完成文件重命名')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要上传 ${dataCategories[category].label} 的 ${categoryFiles.length} 个文件吗？`,
      '确认上传',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      },
    )
  } catch {
    return
  }

  uploadLoading.value = true
  let successCount = 0
  let failCount = 0

  try {
    for (const fileItem of categoryFiles) {
      try {
        const formData = new FormData()

        // 创建重命名后的文件
        const finalFileName = getFinalFileName(fileItem)
        const renamedFile = new File([fileItem.file], finalFileName, {
          type: fileItem.file.type,
        })

        formData.append('file', renamedFile)
        formData.append('operator', String(store.userId))
        formData.append('category', fileItem.category)
        formData.append('dataType', fileItem.dataType)
        formData.append('structured', String(fileItem.structured))

        await axios.post('/api/device/data/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        successCount++
      } catch (error) {
        console.error(`文件 ${fileItem.displayName} 上传失败:`, error)
        failCount++
      }
    }

    if (successCount > 0) {
      ElMessage.success(`${dataCategories[category].label}：成功上传 ${successCount} 个文件`)
      // 上传成功的文件从列表中移除
      selectedFiles.value = selectedFiles.value.filter(
        (file) =>
          file.category !== category ||
          categoryFiles.find((cf) => cf.id === file.id && failCount > 0),
      )
    }
    if (failCount > 0) {
      ElMessage.error(`${dataCategories[category].label}：${failCount} 个文件上传失败`)
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败')
  } finally {
    uploadLoading.value = false
  }
}

// 批量上传所有文件
const handleBatchUpload = async () => {
  if (selectedFiles.value.length === 0) {
    ElMessage.error('请先选择文件')
    return
  }

  // 检查是否有文件正在重命名
  const renamingFile = selectedFiles.value.find((file) => file.isRenaming)
  if (renamingFile) {
    ElMessage.error('请先完成文件重命名')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要上传全部 ${selectedFiles.value.length} 个文件吗？`,
      '确认上传',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      },
    )
  } catch {
    return
  }

  uploadLoading.value = true
  let successCount = 0
  let failCount = 0

  try {
    for (const fileItem of selectedFiles.value) {
      try {
        const formData = new FormData()

        // 创建重命名后的文件
        const finalFileName = getFinalFileName(fileItem)
        const renamedFile = new File([fileItem.file], finalFileName, {
          type: fileItem.file.type,
        })

        formData.append('file', renamedFile)
        formData.append('operator', String(store.userId))
        formData.append('category', fileItem.category)
        formData.append('dataType', fileItem.dataType)
        formData.append('structured', String(fileItem.structured))

        await axios.post('/api/device/data/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        successCount++
      } catch (error) {
        console.error(`文件 ${fileItem.displayName} 上传失败:`, error)
        failCount++
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功上传 ${successCount} 个文件`)
    }
    if (failCount > 0) {
      ElMessage.error(`${failCount} 个文件上传失败`)
    }

    // 如果全部成功，清空文件列表
    if (failCount === 0) {
      handleReset()
    }
  } catch (error) {
    console.error('批量上传失败:', error)
    ElMessage.error('批量上传失败')
  } finally {
    uploadLoading.value = false
  }
}

// 重置所有状态
const handleReset = () => {
  selectedFiles.value = []
  selectedCategory.value = ''
  selectedDataType.value = ''
}

// 清空文件列表
const clearAllFiles = () => {
  selectedFiles.value = []
}
</script>

<template>
  <div class="file-upload">
    <el-card shadow="hover" class="upload-card">
      <template #header>
        <div class="card-header">
          <span>工业设备数据上传</span>
          <el-button
            v-if="selectedFiles.length > 0"
            type="danger"
            size="small"
            @click="clearAllFiles"
          >
            清空全部
          </el-button>
        </div>
      </template>

      <div class="upload-content">
        <!-- 数据分类选择 -->
        <div class="category-section">
          <el-card shadow="never" class="category-card">
            <div class="category-header">
              <span class="section-title">数据分类选择</span>
            </div>

            <el-form :model="{ selectedCategory, selectedDataType }" label-width="120px">
              <el-form-item label="数据大类：" required>
                <!-- 改为使用按钮组而不是单选框，支持任意切换 -->
                <div class="category-buttons">
                  <el-button
                    v-for="(category, key) in dataCategories"
                    :key="key"
                    :type="selectedCategory === key ? 'primary' : 'default'"
                    :class="{ 'has-files': filesByCategory[key]?.length > 0 }"
                    @click="handleCategoryClick(key)"
                    class="category-button"
                  >
                    {{ category.label }}
                    <el-badge
                      v-if="filesByCategory[key]?.length > 0"
                      :value="filesByCategory[key].length"
                      :max="99"
                      class="file-count-badge"
                    />
                  </el-button>
                </div>
              </el-form-item>

              <el-form-item label="具体类型：" required>
                <el-select
                  v-model="selectedDataType"
                  placeholder="请先选择数据大类"
                  :disabled="!selectedCategory"
                  style="width: 280px"
                >
                  <el-option
                    v-for="type in currentDataTypes"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center">
                      <span>{{ type.label }}</span>
                      <el-tag size="small" :type="type.structured ? 'success' : 'info'">
                        {{ type.structured ? '结构化' : '非结构化' }}
                      </el-tag>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>

              <!-- 显示支持的文件格式 -->
              <el-form-item v-if="selectedDataType" label="支持格式：">
                <div class="supported-formats">
                  <el-tag
                    v-for="format in dataCategories[selectedCategory].types[selectedDataType]
                      .fileTypes"
                    :key="format"
                    size="small"
                    effect="plain"
                  >
                    {{ format }}
                  </el-tag>
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <!-- 文件上传区域 -->
        <div class="upload-section">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            :accept="currentAcceptedTypes"
            :disabled="!selectedCategory || !selectedDataType"
            multiple
            drag
          >
            <div class="upload-dragger">
              <el-icon class="upload-icon"><upload-filled /></el-icon>
              <div class="upload-text">
                <p v-if="!selectedCategory || !selectedDataType">请先选择数据分类和类型</p>
                <template v-else>
                  <p>将文件拖拽到此处，或<em>点击上传</em></p>
                  <p class="upload-tip">
                    支持格式：{{
                      dataCategories[selectedCategory].types[selectedDataType].fileTypes.join(', ')
                    }}
                  </p>
                  <p class="upload-category">
                    当前分类：{{ dataCategories[selectedCategory]?.label }} -
                    {{ dataCategories[selectedCategory]?.types[selectedDataType].label }}
                    <el-tag size="small" :type="isStructuredData ? 'success' : 'info'">
                      {{ isStructuredData ? '结构化数据' : '非结构化数据' }}
                    </el-tag>
                  </p>
                </template>
              </div>
            </div>
          </el-upload>
        </div>

        <!-- 分类文件列表 -->
        <div v-if="selectedFiles.length > 0" class="file-categories-section">
          <el-divider content-position="left">
            文件分类管理
            <el-tag size="small" type="info" style="margin-left: 8px">
              总计: {{ selectedFiles.length }} 个文件
            </el-tag>
          </el-divider>

          <!-- 按大类分组显示文件 -->
          <div
            v-for="(categoryKey, index) in Object.keys(filesByCategory)"
            :key="categoryKey"
            class="category-group"
          >
            <div class="category-group-header">
              <div class="category-title">
                <el-icon><folder /></el-icon>
                <span>{{ dataCategories[categoryKey].label }}</span>
                <el-tag size="small" type="primary"
                  >{{ filesByCategory[categoryKey].length }} 个文件</el-tag
                >
                <el-tag size="small" type="info">
                  {{
                    formatFileSize(
                      filesByCategory[categoryKey].reduce((sum, file) => sum + file.size, 0),
                    )
                  }}
                </el-tag>
              </div>
              <div class="category-actions">
                <el-button
                  size="small"
                  type="primary"
                  :loading="uploadLoading"
                  @click="handleCategoryUpload(categoryKey)"
                >
                  上传该分类 ({{ filesByCategory[categoryKey].length }})
                </el-button>
                <el-button size="small" type="danger" text @click="clearCategoryFiles(categoryKey)">
                  清空
                </el-button>
              </div>
            </div>

            <div class="file-list">
              <div v-for="file in filesByCategory[categoryKey]" :key="file.id" class="file-item">
                <div class="file-info">
                  <el-icon class="file-icon" :class="`icon-${getFileIcon(file.originalName)}`">
                    <component :is="getFileIcon(file.originalName)" />
                  </el-icon>

                  <!-- 文件名显示/编辑 -->
                  <div class="file-name-section">
                    <div v-if="!file.isRenaming" class="file-name-display">
                      <span
                        class="file-name"
                        @dblclick="startRename(file)"
                        :title="'双击修改文件名'"
                      >
                        {{ getFinalFileName(file) }}
                      </span>
                      <div class="file-tags">
                        <el-tag size="small" type="info">
                          {{ dataCategories[file.category]?.types[file.dataType].label }}
                        </el-tag>
                        <el-tag
                          size="small"
                          :type="getFileTypeColor(file.originalName)"
                          effect="plain"
                        >
                          {{ getFileExtension(file.originalName).toUpperCase() }}
                        </el-tag>
                        <el-tag size="small" :type="file.structured ? 'success' : 'info'">
                          {{ file.structured ? '结构化' : '非结构化' }}
                        </el-tag>
                      </div>
                    </div>

                    <div v-else class="file-name-edit">
                      <el-input
                        v-model="file.tempName"
                        size="small"
                        style="width: 200px"
                        @keyup.enter="confirmRename(file)"
                        @keyup.esc="cancelRename(file)"
                        ref="renameInput"
                      />
                      <span class="file-extension">.{{ getFileExtension(file.originalName) }}</span>
                      <el-button size="small" type="primary" @click="confirmRename(file)">
                        确定
                      </el-button>
                      <el-button size="small" @click="cancelRename(file)"> 取消 </el-button>
                    </div>
                  </div>

                  <div class="file-meta">
                    <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  </div>
                </div>

                <div class="file-actions">
                  <el-button
                    v-if="!file.isRenaming"
                    size="small"
                    type="primary"
                    text
                    @click="startRename(file)"
                  >
                    重命名
                  </el-button>
                  <el-button size="small" type="danger" text @click="removeFile(file.id)">
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-section">
          <el-button
            type="primary"
            size="large"
            :loading="uploadLoading"
            :disabled="selectedFiles.length === 0"
            @click="handleBatchUpload"
          >
            <el-icon><upload /></el-icon>
            批量上传全部 ({{ selectedFiles.length }})
          </el-button>

          <el-button
            v-if="selectedFiles.length > 0 || selectedCategory || selectedDataType"
            size="large"
            @click="handleReset"
          >
            重置全部
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.file-upload {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-card {
  flex: 1;
  display: flex !important;
  flex-direction: column;
}

:deep(.upload-card .el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
}

/* 分类选择区域 */
.category-section {
  margin-bottom: 16px;
}

.category-card {
  background: #f8f9fa;
}

.category-header {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.supported-formats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 大类选择样式 */
:deep(.el-radio-group .el-radio) {
  margin-right: 24px;
  position: relative;
}

:deep(.el-radio.has-files .el-radio__label) {
  color: #409eff;
  font-weight: 500;
}

.file-count-badge {
  margin-left: 8px;
}

/* 上传区域 */
.upload-section {
  margin-bottom: 8px;
}

.upload-dragger {
  padding: 15px;
  text-align: center;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  transition: border-color 0.3s;
}

.upload-dragger:hover {
  border-color: #409eff;
}

.upload-icon {
  font-size: 40px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 4px 0;
  color: #606266;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.upload-tip {
  font-size: 10px;
  color: #909399;
}

.upload-category {
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* 分类文件列表 */
.file-categories-section {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
}

.category-group {
  margin-bottom: 20px;
}

.category-group:last-child {
  margin-bottom: 0;
}

.category-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px 8px 0 0;
  border: 1px solid #e4e7ed;
  border-bottom: none;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #303133;
}

.category-actions {
  display: flex;
  gap: 8px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #e4e7ed;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  transition: all 0.3s;
}

.file-item:hover {
  background: #f0f9ff;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-icon {
  font-size: 20px;
  color: #409eff;
}

.icon-picture {
  color: #67c23a;
}

.icon-video-camera {
  color: #e6a23c;
}

.icon-cpu {
  color: #f56c6c;
}

.icon-edit {
  color: #909399;
}

.file-name-section {
  flex: 1;
}

.file-name-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-name {
  font-weight: 500;
  color: #303133;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.file-name:hover {
  background-color: #f0f9ff;
  color: #409eff;
}

.file-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.file-name-edit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-extension {
  color: #909399;
  font-size: 14px;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-size {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
}

.file-actions {
  display: flex;
  gap: 8px;
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* Element Plus 样式覆盖 */
:deep(.el-upload-dragger) {
  width: 100%;
  border: none;
  background: transparent;
}

:deep(.el-upload-dragger:hover) {
  background: transparent;
}

:deep(.el-select-dropdown__item) {
  height: auto;
  padding: 8px 20px;
}
</style>
