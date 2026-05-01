const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const tools = [
    { name: "ChatGPT", category: "Text", link: "https://chat.openai.com", description: "The most popular AI chatbot by OpenAI for text generation and assistance." },
    { name: "Claude 3", category: "Text", link: "https://claude.ai", description: "Advanced AI model by Anthropic with high context window and reasoning." },
    { name: "Midjourney", category: "Image", link: "https://midjourney.com", description: "Elite AI image generator known for artistic and photorealistic results." },
    { name: "DALL-E 3", category: "Image", link: "https://openai.com/dall-e-3", description: "OpenAI's latest image model with incredible prompt following." },
    { name: "GitHub Copilot", category: "Coding", link: "https://github.com/features/copilot", description: "AI pair programmer that helps you write code faster." },
    { name: "Jasper", category: "Marketing", link: "https://jasper.ai", description: "AI writing assistant for marketing copy, blogs, and social media." },
    { name: "Runway Gen-2", category: "Video", link: "https://runwayml.com", description: "Next-gen AI video generation from text and images." },
    { name: "Pika Labs", category: "Video", link: "https://pika.art", description: "Powerful AI video generation tool for cinematic clips." },
    { name: "ElevenLabs", category: "Audio", link: "https://elevenlabs.io", description: "Most realistic AI text-to-speech and voice cloning." },
    { name: "Perplexity AI", category: "Search", link: "https://perplexity.ai", description: "AI-powered search engine that provides cited answers." },
    { name: "Gamma", category: "Presentation", link: "https://gamma.app", description: "Create beautiful presentations and websites using AI." },
    { name: "Cursor", category: "Coding", link: "https://cursor.com", description: "The AI-first code editor built for pair programming." },
    { name: "Adobe Firefly", category: "Image", link: "https://adobe.com/firefly", description: "Adobe's creative generative AI for creators." },
    { name: "Leonardo.ai", category: "Image", link: "https://leonardo.ai", description: "Full creative suite for high-quality image generation." },
    { name: "Sora", category: "Video", link: "https://openai.com/sora", description: "OpenAI's photorealistic text-to-video generator." },
    { name: "Vercel V0", category: "Coding", link: "https://v0.dev", description: "Generative UI for React and Tailwind CSS." },
    { name: "Groq", category: "Infrastructure", link: "https://groq.com", description: "Ultra-fast AI inference engine for LLMs." },
    { name: "Luma Dream Machine", category: "Video", link: "https://lumalabs.ai/dream-machine", description: "High-quality video generation from text and images." },
    { name: "Copy.ai", category: "Marketing", link: "https://copy.ai", description: "Automate your marketing workflows with AI." },
    { name: "Suno AI", category: "Audio", link: "https://suno.com", description: "Create high-quality music and songs from text prompts." },
    { name: "Udio", category: "Audio", link: "https://udio.com", description: "Next-gen AI music creation platform." },
    { name: "Canva Magic Studio", category: "Design", link: "https://canva.com", description: "AI-powered design tools within Canva." },
    { name: "Notion AI", category: "Productivity", link: "https://notion.so", description: "AI writing and organization assistant inside Notion." },
    { name: "Descript", category: "Video", link: "https://descript.com", description: "AI-powered video and podcast editing via text." },
    { name: "Liner", category: "Search", link: "https://getliner.com", description: "AI search and highlight tool for web browsing." },
    { name: "Poised", category: "Coaching", link: "https://poised.com", description: "AI communication coach for public speaking." },
    { name: "Rewind AI", category: "Productivity", link: "https://rewind.ai", description: "The search engine for your life; record and search your screen." },
    { name: "InVideo", category: "Video", link: "https://invideo.io", description: "Create videos from text scripts in minutes." },
    { name: "Feedly AI", category: "News", link: "https://feedly.com", description: "AI-powered news feed and intelligence tool." },
    { name: "Otter.ai", category: "Meetings", link: "https://otter.ai", description: "AI meeting assistant for transcription and notes." },
    { name: "Surfer SEO", category: "Marketing", link: "https://surferseo.com", description: "AI tool for optimizing content for search engines." },
    { name: "Grammarly AI", category: "Writing", link: "https://grammarly.com", description: "AI writing assistant for grammar and tone." },
    { name: "Quillbot", category: "Writing", link: "https://quillbot.com", description: "AI paraphrasing and summarizing tool." },
    { name: "Blackbox AI", category: "Coding", link: "https://blackbox.ai", description: "AI coding assistant and code search engine." },
    { name: "Tabnine", category: "Coding", link: "https://tabnine.com", description: "AI code completions for professional developers." },
    { name: "Codeium", category: "Coding", link: "https://codeium.com", description: "Free AI code acceleration and search." },
    { name: "AOM", category: "Music", link: "https://aom.ai", description: "AI-generated music for creators." },
    { name: "DeepL", category: "Translation", link: "https://deepl.com", description: "The world's most accurate AI translator." },
    { name: "Phind", category: "Coding", link: "https://phind.com", description: "AI search engine for developers." },
    { name: "Replicate", category: "Infrastructure", link: "https://replicate.com", description: "Run machine learning models with an API." },
    { name: "Hugging Face", category: "Platform", link: "https://huggingface.co", description: "The AI community building the future of open models." },
    { name: "Together AI", category: "Infrastructure", link: "https://together.ai", description: "Cloud platform for building and running open source AI." },
    { name: "Mistral AI", category: "Text", link: "https://mistral.ai", description: "High-performance open-source LLMs from France." },
    { name: "Grok", category: "Text", link: "https://x.ai", description: "Elon Musk's AI assistant integrated with X." },
    { name: "Gemini", category: "Text", link: "https://gemini.google.com", description: "Google's most capable AI model family." },
    { name: "Cohere", category: "Platform", link: "https://cohere.com", description: "AI for the enterprise: search, classify, and generate." }
];

async function seed() {
    console.log('🌱 Seeding AI Tools...');
    // We can duplicate these tools to reach 500 or keep adding more.
    // For now, I'll insert these high-quality ones.
    const { error } = await supabase.from('ai_tools').insert(tools);
    if (error) console.error('Error seeding:', error);
    else console.log('✅ Successfully seeded AI tools!');
}

seed();
