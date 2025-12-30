# Icon API Documentation

## 🎯 Basic Usage

```
/api/icons?i=react,vue,angular
```

## 📋 Parameters

### Required
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `i` | string | Icon list (separated by commas) | `react,vue,angular` |

### Layout Options
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | string | `h` | Layout type: `h` (horizontal), `v` (vertical), `g` (grid) |
| `columns` | number | `4` | Number of columns (only used with layout=g) |
| `size` | number | `48` | Icon size (16-256px) |
| `gap` | number | `12` | Icon gap (0-100px) |
| `padding` | number | `0` | Padding around the container |

### Styling Options
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | - | Theme preset: `light`, `dark` |
| `bg` | string | transparent | Background color (hex without #) |
| `radius` | number | `0` | Border radius (px) |
| `border` | string | - | Border color (hex without #) |
| `borderWidth` | number | `0` | Border width (px) |
| `shadow` | number | `0` | Shadow intensity (0-3) |
| `glow` | boolean | `false` | Glow effect cho icons |

## 🎨 Examples

### Horizontal Layout với Dark Theme
```
/api/icons?i=html,css,js&theme=dark&padding=16&radius=8&shadow=2
```

### Vertical Layout với Custom Background
```
/api/icons?i=react,vue,angular&layout=v&bg=f0f0f0&padding=20&gap=16
```

### Grid Layout với Border
```
/api/icons?i=html,css,js,react,vue,angular,nodejs,python&layout=g&columns=4&border=cccccc&borderWidth=2&padding=24&radius=12
```

### Glow Effect
```
/api/icons?i=react,vue,angular&glow=true&theme=dark&padding=20&radius=8
```

### Light Theme với Shadow
```
/api/icons?i=figma,sketch,photoshop&theme=light&shadow=3&padding=16&radius=12
```

### Custom Styling
```
/api/icons?i=github,gitlab,bitbucket&bg=2d3748&size=64&gap=20&padding=24&radius=16&shadow=2
```

## 🔧 Technical Details

### Response Headers
- `Content-Type: image/svg+xml`
- `Cache-Control: public, max-age=86400, stale-while-revalidate=60`

### Error Codes
- `400`: Missing or invalid parameters
- `404`: No valid icons found
- `500`: Server error

### Validation Rules
- Icon size: 16-256px
- Gap: 0-100px
- Shadow: 0-3
- Layout: must be `h`, `v`, or `g`

## 💡 Tips

1. **Performance**: Icons are cached for 24 hours, using the same parameters to take advantage of the cache.
2. **Theme vs. Custom BG**: Themes will be overridden if they have a `bg` parameter.
3. **Grid Layout**: Calculates the appropriate number of columns to match the number of icons to avoid empty rows.
4. **Shadow + Glow**: Can combine both to create special effects.
5. **Border**: Only visible when both `border` and `borderWidth > 0` are present.

## 🎨 Color Format

All colors use hex format **without the # symbol**:
- ✅ Correct: `bg=ffffff`, `border=cccccc`
- ❌ Wrong: `bg=#ffffff`, `border=#cccccc`

## 🚀 Quick Start Examples

### Simple
```html
<img src="/api/icons?i=react,vue,angular" />
```

### Styled Badge
```html
<img src="/api/icons?i=html,css,js&theme=dark&padding=12&radius=8&shadow=2" />
```

### Tech Stack Display
```html
<img src="/api/icons?i=react,nodejs,mongodb,docker&layout=h&bg=f8f9fa&padding=16&gap=16&radius=12&border=dee2e6&borderWidth=1" />
```
