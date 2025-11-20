# 🎨 Dynamic Action-Specific Fields

## Overview

The modal now shows **different fields based on the selected action**, making the interface much more intuitive and relevant to each task.

## ✨ What Changed

### Before:
- Same fields for all actions
- Generic "Profile/Account" dropdown
- Generic "Language" selector
- Not optimized for each action type

### After:
- **Dynamic fields** that change when you select different actions
- **Action-specific options** relevant to each task
- **Smart UI** that hides/shows fields based on context

## 📋 Action-Specific Fields

### 1. Rewrite for Twitter
**Fields shown:**
- 🐦 **Twitter Profile** (michalku_com, aicko_cz)
- 🌍 **Output Language** (11 languages)
- 💬 **Additional Instructions**
- 🔗 **Send to webhook**

**Use case:** Converting any text into Twitter-optimized posts

---

### 2. Create Article
**Fields shown:**
- 📰 **Target Platform:**
  - Medium
  - Substack
  - WordPress
  - Dev.to
  - Hashnode
  - LinkedIn Article
  - Personal Blog
  - General

- ✍️ **Article Style:**
  - Tutorial/How-to
  - Analysis/Opinion
  - Case Study
  - News/Update
  - Listicle
  - Story/Narrative

- 🌍 **Output Language**
- 💬 **Additional Instructions**
- 🔗 **Send to webhook**

**Use case:** Expanding short notes into full articles

---

### 3. Summarize
**Fields shown:**
- 📏 **Summary Length:**
  - Brief (1-2 sentences)
  - Short (1 paragraph) - default
  - Medium (2-3 paragraphs)
  - Detailed (4+ paragraphs)

- 📝 **Summary Format:**
  - Paragraph
  - Bullet Points
  - Numbered List

- 🌍 **Output Language**
- 💬 **Additional Instructions**
- 🔗 **Send to webhook**

**Use case:** Creating concise summaries of long content

---

### 4. Translate
**Fields shown:**
- 🌍 **Target Language** (11 languages)
- 🎭 **Translation Style:**
  - Literal (Word-for-word)
  - Natural (Localized) - default
  - Formal
  - Casual

- 💬 **Additional Instructions**
- 🔗 **Send to webhook**

**Note:** Output Language selector is **hidden** (uses target language instead)

**Use case:** Translating content to different languages

---

### 5. Extract Insights
**Fields shown:**
- 🔢 **Number of Insights:**
  - Top 3 Insights
  - Top 5 Insights - default
  - Top 7 Insights
  - Top 10 Insights

- 🎯 **Focus On:**
  - All Insights - default
  - Actionable Items
  - Key Lessons
  - Data/Statistics
  - Important Quotes

- 🌍 **Output Language**
- 💬 **Additional Instructions**
- 🔗 **Send to webhook**

**Use case:** Extracting key takeaways from articles/content

---

### 6. Save to Memory
**Fields shown:**
- 🏷️ **Category/Tag** (text input)
  - Examples: "research", "quotes", "ideas"

- ⭐ **Priority:**
  - Low - Reference
  - Medium - Important - default
  - High - Critical

- 💬 **Additional Comment**

**Note:** Webhook and language selectors are **hidden** (not relevant for memory)

**Use case:** Saving text for later without processing

---

## 🔄 How It Works

### User Experience:
1. **Select an action** (radio button)
2. **Fields update automatically** - relevant options appear
3. **Fill in action-specific fields**
4. **Click "Process"** or "Save to Memory"

### Technical Flow:
```javascript
User selects action
  ↓
onChange event fires
  ↓
getActionSpecificFields(mode)
  ↓
Update #action-specific-fields div
  ↓
Show/hide language selector
  ↓
Show/hide webhook option
```

## 💾 Data Structure

### Sent to Background Script:
```javascript
{
  text: "selected text",
  context: { url, title, timestamp },
  mode: "article",
  actionParams: {
    mode: "article",
    targetPlatform: "medium",
    articleStyle: "tutorial"
  },
  language: "en",
  comment: "additional instructions",
  sendWebhook: true
}
```

### Sent to AI (via settings-manager.js):
```
Base prompt from mode template
+ Profile placeholders (if profile exists)
+ Action-specific instructions:
  - Target Platform: medium
  - Article Style: tutorial
+ Language instruction
+ Original text
+ Additional context
```

## 🎯 Examples

### Example 1: Create Article for Medium
```
Selected action: "Create Article"
Target Platform: "Medium"
Article Style: "Tutorial"
Output Language: "English"

AI receives prompt:
"Create a tutorial-style article for Medium platform..."
```

### Example 2: Summarize as Bullet Points
```
Selected action: "Summarize"
Summary Length: "Short"
Summary Format: "Bullet Points"

AI receives prompt:
"Summarize in 1 paragraph using bullet points..."
```

### Example 3: Save with Priority Tag
```
Selected action: "Save to Memory"
Category: "research"
Priority: "High"

Saves to database with:
context: {
  ...pageContext,
  tag: "research",
  priority: "high"
}
```

## 🛠️ Implementation Details

### New Functions:

#### `getActionSpecificFields(mode)`
Returns HTML for action-specific fields based on mode

#### `collectActionParameters(mode)`
Collects values from action-specific fields

#### `saveToMemoryWithParams(text, context, actionParams)`
Saves to memory with additional parameters

### Updated Functions:

#### `processText(text, context, mode, actionParams, language, comment, sendWebhook)`
Now accepts `actionParams` object instead of single `account` parameter

#### `buildPrompt(mode, accountId, text, comment, language, actionParams)`
Enhanced to include action-specific instructions in prompt

## 🎨 UI Behavior

### Smart Field Display:
- **Twitter mode:** Shows profiles
- **Article mode:** Shows platforms & styles
- **Translate mode:** Hides output language (has target language)
- **Memory mode:** Hides webhook & language
- **All modes:** Show additional instructions field

### Real-time Updates:
- Change action → Fields update instantly
- No page refresh needed
- Smooth transitions

## 📊 Benefits

### For Users:
✅ **Clearer interface** - Only see relevant options
✅ **Faster workflow** - Less scrolling, less confusion
✅ **Better results** - More specific AI instructions
✅ **Intuitive** - Fields match the action intent

### For Developers:
✅ **Extensible** - Easy to add new actions
✅ **Maintainable** - Clean separation of concerns
✅ **Flexible** - Action params can be anything
✅ **Typed** - Clear data structure

## 🚀 Future Enhancements

### Possible Additions:
- [ ] Custom field types (file upload, URL input)
- [ ] Field validation before processing
- [ ] Save favorite combinations per action
- [ ] Action presets/templates
- [ ] Conditional fields (field A shows if field B = X)
- [ ] Multi-step wizards for complex actions
- [ ] Field tooltips with examples
- [ ] Recent selections memory

## 🧪 Testing

### To Test:
1. Open modal (select text → right-click)
2. Click each action type
3. Verify correct fields appear
4. Fill in fields
5. Click "Process"
6. Check console for actionParams object
7. Verify AI receives correct instructions

### Test Checklist:
- [ ] Twitter → Shows profiles
- [ ] Article → Shows platforms & styles
- [ ] Summarize → Shows length & format
- [ ] Translate → Shows target language, hides output language
- [ ] Extract → Shows count & focus
- [ ] Memory → Shows tag & priority, hides webhook

## 📝 Usage Tips

### For Best Results:

**Twitter:**
- Choose profile that matches your brand
- Keep additional instructions brief

**Article:**
- Select correct platform for formatting
- Match article style to content type

**Summarize:**
- Brief for quick overviews
- Detailed for comprehensive summaries
- Bullets for scannable content

**Translate:**
- Natural for everyday content
- Formal for business documents
- Literal for technical accuracy

**Insights:**
- More insights = more comprehensive
- Focus on specific type for targeted output

**Memory:**
- Use consistent tags for organization
- Set priority for later filtering
- Add context in comment field

---

**Version:** 2.1.0
**Updated:** January 2025
**Status:** ✅ Production Ready
