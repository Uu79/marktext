// Mermaid v10 rendering fix
// This file contains the correct implementation for Mermaid v10 API

export async function renderMermaidV10 (mermaid, key, code, target, sanitize, PREVIEW_DOMPURIFY_CONFIG, CLASS_OR_ID) {
  try {
    // Generate a unique ID for this mermaid diagram
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Set the content with the unique ID
    const mermaidCode = sanitize(code, PREVIEW_DOMPURIFY_CONFIG, true)
    target.innerHTML = `<div class="mermaid" id="${id}">${mermaidCode}</div>`

    // For Mermaid v10, we need to use the new API
    // The run() method processes all elements with class 'mermaid'
    if (mermaid.run) {
      // v10+ API
      await mermaid.run({
        nodes: [document.getElementById(id)],
        suppressErrors: false
      })
    } else if (mermaid.render) {
      // Alternative v10 API using render()
      const { svg } = await mermaid.render(id, code)
      target.innerHTML = svg
    } else {
      // Fallback to old API
      mermaid.init(undefined, target.querySelector('.mermaid'))
    }

    return true
  } catch (err) {
    console.error('Mermaid rendering error:', err)
    return false
  }
}
