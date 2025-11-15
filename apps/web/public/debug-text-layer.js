/**
 * Debug script to check text layer z-index and pointer events
 *
 * Usage:
 * 1. Open browser console
 * 2. Copy and paste this entire script
 * 3. Check the console output
 */

console.log('=== TEXT LAYER DEBUG ===')

// Find all text layers
const textLayers = document.querySelectorAll('.textLayer')
console.log(`Found ${textLayers.length} text layers`)

textLayers.forEach((layer, index) => {
  const computed = window.getComputedStyle(layer)
  const rect = layer.getBoundingClientRect()

  console.log(`\nText Layer ${index + 1}:`)
  console.log('  Position:', computed.position)
  console.log('  Z-Index:', computed.zIndex)
  console.log('  Pointer Events:', computed.pointerEvents)
  console.log('  Cursor:', computed.cursor)
  console.log('  User Select:', computed.userSelect)
  console.log('  Dimensions:', {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left
  })

  // Check if there are any children
  const spans = layer.querySelectorAll('span')
  console.log(`  Text spans: ${spans.length}`)

  if (spans.length > 0) {
    const firstSpan = spans[0]
    const spanStyle = window.getComputedStyle(firstSpan)
    console.log('  First span style:')
    console.log('    Position:', spanStyle.position)
    console.log('    Pointer Events:', spanStyle.pointerEvents)
    console.log('    Cursor:', spanStyle.cursor)
    console.log('    Color:', spanStyle.color)
    console.log('    User Select:', spanStyle.userSelect)
  }
})

// Check what element is at the mouse position (center of viewport)
const centerX = window.innerWidth / 2
const centerY = window.innerHeight / 2
const elementAtCenter = document.elementFromPoint(centerX, centerY)

console.log('\n=== ELEMENT AT CENTER OF VIEWPORT ===')
console.log('Element:', elementAtCenter?.tagName, elementAtCenter?.className)
console.log('Computed style:')
if (elementAtCenter) {
  const computed = window.getComputedStyle(elementAtCenter)
  console.log('  Cursor:', computed.cursor)
  console.log('  Pointer Events:', computed.pointerEvents)
  console.log('  Z-Index:', computed.zIndex)
  console.log('  User Select:', computed.userSelect)
}

// Check all elements with z-index > 900
console.log('\n=== HIGH Z-INDEX ELEMENTS ===')
const allElements = document.querySelectorAll('*')
const highZIndexElements = []
allElements.forEach(el => {
  const computed = window.getComputedStyle(el)
  const zIndex = parseInt(computed.zIndex)
  if (zIndex > 900 && !isNaN(zIndex)) {
    highZIndexElements.push({
      element: el.tagName + (el.className ? `.${el.className}` : ''),
      zIndex: zIndex,
      pointerEvents: computed.pointerEvents,
      cursor: computed.cursor
    })
  }
})
console.log('Elements with z-index > 900:', highZIndexElements)

console.log('\n=== DEBUG COMPLETE ===')
console.log('Please hover over the PDF and check if the cursor changes to text cursor (I-beam)')
