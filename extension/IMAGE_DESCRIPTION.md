# 🖼️ Image Description Feature

## Overview

Click any image on any website to analyze it with AI and generate a detailed recreation prompt perfect for AI image generators like Midjourney, DALL-E, or Stable Diffusion.

## ✨ Features

### AI Vision Analysis
- **Model:** Google Gemini 2.0 Flash (via OpenRouter)
- **Purpose:** Analyze images and generate recreation prompts
- **Speed:** Fast processing with vision-capable model

### Detail Levels

#### 1. **Standard Analysis** (Default)
- General description of the image
- Main subject and composition
- Colors, lighting, and style
- Basic recreation prompt

#### 2. **Detailed Analysis**
- Extensive details about every element
- Textures, patterns, and nuances
- Comprehensive visual description
- Detailed recreation prompt

#### 3. **Technical** (For Photographers)
- Camera settings and specifications
- Lighting setup and techniques
- Lens characteristics
- Composition techniques
- Technical photography details

#### 4. **Artistic** (For Designers)
- Color theory and palette
- Visual balance and composition
- Emotional impact and mood
- Design principles used
- Creative techniques

## 🚀 How to Use

### Method 1: Click Image + FAB
1. **Click on any image** on a website
2. **FAB appears** in bottom-left corner
3. **Click "Process"** from the FAB menu
4. **Modal opens** with the image preview
5. **Select "Describe Image"** action (pre-selected)
6. **Choose detail level** (Standard, Detailed, Technical, or Artistic)
7. **Click "Process"**
8. **Get your recreation prompt!**

### Method 2: Right-Click Context Menu
1. **Right-click any image**
2. Select **"Process Selected Text"**
3. Follow steps 4-8 from Method 1

## 📋 What You Get

### Analysis Output
The AI provides:

1. **Detailed Description**
   - Main subject identification
   - Composition breakdown
   - Visual style and mood
   - Color analysis
   - Lighting and shadows
   - Technical details

2. **Recreation Prompt**
   - Clearly marked section starting with "RECREATION PROMPT:"
   - Comprehensive prompt ready to use
   - Optimized for AI image generators
   - Includes style, mood, technical details

### Example Output
```
This image shows a serene mountain landscape at golden hour...

Main Subject: Snow-capped mountain peaks with a reflective lake
Composition: Rule of thirds, with mountains in upper portion
Colors: Warm golden tones, deep blue shadows, white highlights
Lighting: Soft golden hour light from the left, creating long shadows
Style: Realistic landscape photography with subtle HDR processing

RECREATION PROMPT: A majestic mountain landscape at golden hour,
snow-capped peaks reflecting in a pristine alpine lake, warm golden
sunlight from the left creating dramatic shadows, realistic photography
style with subtle HDR, rule of thirds composition, professional nature
photography, 8k resolution, cinematic lighting
```

## 🎯 Use Cases

### 1. **Reverse Image Prompting**
- Found an inspiring image online?
- Get the perfect prompt to recreate it
- Use with Midjourney, DALL-E, or Stable Diffusion

### 2. **Learning Prompting**
- Understand what makes images work
- Learn professional prompt structure
- Study composition and style descriptions

### 3. **Design Reference**
- Analyze competitor designs
- Understand visual techniques
- Document design inspirations

### 4. **Photography Analysis**
- Technical breakdown of photos
- Lighting and composition study
- Learn from professional work

### 5. **Art Direction**
- Create mood boards with prompts
- Communicate visual concepts
- Brief designers with precise descriptions

## 🔧 Technical Details

### Image Processing
```javascript
// Image click detection
- Listens for clicks on <img> elements
- Captures image source, dimensions, and alt text
- Sends image URL directly to API (no base64 conversion)

// Data sent to API
{
  imageData: "https://example.com/image.jpg",  // Direct URL
  mode: "describe_image",
  actionParams: {
    detailLevel: "standard" | "detailed" | "technical" | "artistic"
  }
}
```

### API Integration
```javascript
// Model: Google Gemini 2.0 Flash
model: "google/gemini-2.0-flash-001"

// Message format (OpenRouter Vision API)
{
  role: "user",
  content: [
    {
      type: "text",
      text: "Analyze this image..."
    },
    {
      type: "image_url",
      imageUrl: {  // camelCase format
        url: "https://example.com/image.jpg"  // Direct URL
      }
    }
  ]
}
```

### Prompt Enhancement
Based on detail level, additional instructions are added:

**Detailed:**
```
Provide extensive details about every visible element,
textures, patterns, and nuances.
```

**Technical:**
```
Focus on technical photography aspects: camera settings,
lighting setup, lens characteristics, composition techniques,
and technical specifications.
```

**Artistic:**
```
Focus on artistic elements: color theory, visual balance,
emotional impact, design principles, and creative techniques used.
```

## 🎨 Modal UI

When an image is selected:
- **Title:** Changes to "🖼️ Process Image"
- **Preview:** Shows the selected image (max 200px height)
- **Dimensions:** Displays image resolution
- **Default action:** "Describe Image" is pre-selected
- **Info box:** Shows Gemini 2.0 Flash badge

## 💡 Tips

### For Best Results:
1. **Choose appropriate detail level:**
   - Standard: Quick overviews
   - Detailed: Comprehensive descriptions
   - Technical: Photography learning
   - Artistic: Design analysis

2. **Add custom instructions:**
   - Specify output format
   - Request specific details
   - Focus on particular aspects

3. **Use output language:**
   - Get prompts in your preferred language
   - Helpful for localized content

### Workflow Examples:

**For Prompt Engineering:**
```
1. Find inspiring image
2. Click → Analyze with "Standard"
3. Copy RECREATION PROMPT section
4. Paste into Midjourney/DALL-E
5. Generate similar images
```

**For Learning:**
```
1. Find professional photo
2. Analyze with "Technical"
3. Study lighting and composition notes
4. Apply learnings to your work
```

**For Design Briefs:**
```
1. Analyze reference images
2. Use "Artistic" detail level
3. Extract design principles
4. Use in creative briefs
```

## 🔐 Privacy & Security

### Image Processing:
- Image URLs sent directly to API (no base64 conversion)
- Sent to OpenRouter API securely via HTTPS
- Not stored on servers (unless you save to memory)
- No CORS issues - uses original image URLs

### Data Flow:
```
Website Image
  ↓
Browser (captures URL)
  ↓
OpenRouter API (encrypted HTTPS)
  ↓
Google Gemini Vision (fetches image)
  ↓
Analysis Result
  ↓
Your Browser
```

## 🛠️ Configuration

### Settings.json
```json
{
  "modes": {
    "describe_image": {
      "name": "Describe Image",
      "description": "Analyze image and generate recreation prompt",
      "promptTemplate": "Analyze this image in detail...",
      "model": "google/gemini-2.0-flash-001"
    }
  }
}
```

### Customization:
- Change prompt template in settings.json
- Adjust detail level descriptions
- Modify model (if OpenRouter adds more vision models)

## 📊 Output Format

The AI always provides:
1. **Analysis Section:** Detailed breakdown
2. **Recreation Prompt:** Clearly marked with "RECREATION PROMPT:"

This makes it easy to:
- Copy just the prompt
- Use the analysis for learning
- Share specific sections

## 🚀 Future Enhancements

Potential additions:
- [ ] Multiple image comparison
- [ ] Style transfer suggestions
- [ ] Composition scoring
- [ ] Color palette extraction
- [ ] Similar image search
- [ ] Batch image processing
- [ ] Export prompts to file

---

**Version:** 2.2.0
**Model:** Google Gemini 2.0 Flash
**Status:** ✅ Production Ready
