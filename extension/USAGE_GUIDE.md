# Universal Text Processor - Quick Start Guide

## ⚡ Quick Start (3 Steps)

### 1. Install the Extension
- Load unpacked in `chrome://extensions/`
- Enable "Developer mode" first

### 2. Configure API Key
- Get key from [openrouter.ai/keys](https://openrouter.ai/keys)
- Select any text → Right-click → "Process Selected Text"
- Click ⚙️ → Enter API key → Save

### 3. Start Using
- Select text anywhere
- Right-click → "Process Selected Text"
- Choose action and profile
- Click "Process"

## 📖 Common Use Cases

### Case 1: Convert Article to Tweet
**Scenario:** You found a great article and want to tweet about it

1. Select key paragraphs from the article
2. Right-click → "Process Selected Text"
3. Choose **"Rewrite for Twitter"** action
4. Select your Twitter profile
5. Click "Process"
6. Copy the generated tweet (📋 Copy button)
7. Paste into Twitter

### Case 2: Save Research for Later
**Scenario:** Collecting information while researching

1. Select important text
2. Right-click → "Save to Memory"
3. Repeat for multiple snippets
4. Access all saved text via 📊 Database button
5. Export as JSON when done

### Case 3: Create Content from Multiple Sources
**Scenario:** Writing an article using various sources

1. Collect text snippets using "Save to Memory"
2. Open database (📊) to review all saved content
3. Select combined text
4. Choose **"Create Article"** action
5. Generate comprehensive article
6. Copy and refine

### Case 4: Summarize Long Documents
**Scenario:** Need to quickly understand a long document

1. Select full text or key sections
2. Right-click → "Process Selected Text"
3. Choose **"Summarize"** action
4. Click "Process"
5. Get concise summary with key points

### Case 5: Translate and Localize
**Scenario:** Need content in multiple languages

1. Select English text
2. Choose **"Translate"** action
3. Select target language (e.g., Czech)
4. Click "Process"
5. Repeat for other languages

### Case 6: Extract Actionable Insights
**Scenario:** Reading business/tech articles for insights

1. Select article or section
2. Choose **"Extract Insights"** action
3. Click "Process"
4. Get bullet-point list of key takeaways
5. Save for reference

## 🎮 Keyboard & Mouse Shortcuts

| Action | Shortcut |
|--------|----------|
| Close modal | ESC key |
| Select text | Mouse drag |
| Context menu | Right-click on selection |
| Copy generated content | Click 📋 Copy button |

## 🎯 Action Selector Guide

### When to use "Rewrite for Twitter"
- Converting articles to tweets
- Making content more engaging
- Staying within 280 character limit
- Adding hashtag suggestions

### When to use "Create Article"
- Expanding short notes
- Building full blog posts
- Creating detailed explanations
- Developing comprehensive content

### When to use "Summarize"
- Long documents or articles
- Research papers
- Meeting notes
- News articles

### When to use "Translate"
- Localizing content
- Multi-language support
- Understanding foreign content
- Creating international versions

### When to use "Extract Insights"
- Learning materials
- Business articles
- Technical documentation
- Best practice guides

### When to use "Save to Memory"
- Collecting research
- Bookmarking quotes
- Building reference library
- Planning future content

## 🔧 Profile Selection Tips

### Professional Profile
Best for:
- Business content
- Technical articles
- Industry analysis
- Formal communications

### Creative Profile
Best for:
- Marketing content
- Engaging stories
- Social media posts
- Brand voice content

### Custom Profiles
Create profiles in `settings.json` for:
- Specific brands
- Different personas
- Niche audiences
- Specialized content types

## 📊 Database Workflow

### Daily Usage
1. **Collect**: Save interesting text throughout the day
2. **Review**: Check database (📊) periodically
3. **Process**: Generate content when needed
4. **Approve**: Mark good outputs as "Approved"
5. **Done**: Mark published content as "Done"

### Status System
- **Pending**: Newly saved/generated content
- **Approved**: Ready to use
- **Done**: Already published/used
- **Rejected**: Not useful, can be deleted

### Export & Backup
- Export database weekly: 📊 → 📥 Export
- Save JSON file as backup
- Import later if needed

## 🌐 Webhook Integration Examples

### Send to Notion
Configure webhook to Notion API endpoint to automatically save processed text to your Notion database.

### Send to Slack
Post generated content to Slack channels for team review.

### Send to Airtable
Build content calendar by sending processed text to Airtable.

### Custom Automation
Use webhook with Zapier, Make.com, or custom API to trigger any workflow.

## 💡 Pro Tips

### Tip 1: Batch Processing
- Save multiple text snippets first
- Review all in database
- Process together for consistency

### Tip 2: Profile Switching
- Use different profiles for different platforms
- Professional for LinkedIn
- Creative for Instagram
- Casual for Twitter

### Tip 3: Iterative Refinement
- Generate content
- Don't approve immediately
- Add additional instructions in comment field
- Re-generate for better results

### Tip 4: Context Preservation
- The extension saves page URL and title
- Click source links in database to return to original
- Useful for attribution and fact-checking

### Tip 5: Webhook for Backup
- Configure webhook to your own server
- Automatic backup of all processed content
- Build custom analytics

## ⚠️ Common Mistakes to Avoid

### ❌ Don't
- Select too much text at once (AI works better with focused content)
- Forget to save API key after entering it
- Delete from database before using content
- Use same profile for all content types

### ✅ Do
- Select specific, relevant paragraphs
- Test different profiles for best results
- Review generated content before using
- Export database regularly for backup

## 🚀 Advanced Workflows

### Multi-Language Content Pipeline
1. Write in English
2. Save to memory
3. Process with "Create Article"
4. Process again with "Translate" for each language
5. All versions saved in database

### Content Repurposing
1. Find long article
2. Generate Twitter thread (Rewrite for Twitter)
3. Generate LinkedIn post (Create Article)
4. Generate insights (Extract Insights)
5. Publish across platforms

### Research Compilation
1. Collect quotes/facts (Save to Memory)
2. Review all saved content
3. Generate article combining sources
4. Extract key insights
5. Create social posts

## 🎓 Learning Resources

### Understanding Prompts
- Check `settings.json` for prompt templates
- Modify templates for custom behavior
- Test different writing profiles

### API Usage
- Monitor OpenRouter dashboard for usage
- Different models have different costs
- Optimize by using appropriate action types

### Extension Development
- Read code in content.js and background.js
- Modify for your specific needs
- Contribute improvements back

## 📞 Getting Help

### Check Logs
- Open DevTools (F12)
- Check Console tab
- Look for error messages

### Test Components
1. Test text selection: Does it highlight?
2. Test context menu: Does it appear?
3. Test API key: Settings shows masked key?
4. Test generation: Does modal show response?

### Debug Webhook
- Check webhook URL is accessible
- Test with curl or Postman first
- Verify endpoint accepts POST
- Check endpoint logs

---

## 🎉 You're Ready!

Start by selecting this text and trying it out! Right-click and choose "Process Selected Text" to see the extension in action.

**Happy Processing!** 🚀
