<template>
  <div ref="host" class="editor" :style="{ height: height }"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { sql, MySQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'

const props = defineProps<{ modelValue: string; height?: string; readonly?: boolean }>()
const emit = defineEmits(['update:modelValue'])

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null

onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    doc: props.modelValue,
    extensions: [
      basicSetup,
      sql({ dialect: MySQL }),
      oneDark,
      EditorState.readOnly.of(!!props.readonly),
      EditorView.editable.of(!props.readonly),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      })
    ]
  })
})

watch(
  () => props.modelValue,
  (value) => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value || '' } })
    }
  }
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<style scoped>
.editor {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: auto;
}
.editor :deep(.cm-editor) {
  height: 100%;
}
</style>
