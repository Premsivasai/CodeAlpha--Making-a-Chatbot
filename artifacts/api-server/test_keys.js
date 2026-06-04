import path from "node:path";
import fs from "node:fs";

// Load environment variables from root .env
const envPath = path.resolve(import.meta.dirname, "../../.env");
console.log("Loading env from:", envPath);
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || "").trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  }
}

import OpenAI from "openai";

async function testKeys() {
  console.log("\n=== TESTING API KEYS ===");

  // 1. Test SerpAPI Key
  const serpApiKey = process.env.SERP_API_KEY;
  console.log(`\n[1/2] SerpAPI Key: ${serpApiKey ? "Configured (" + serpApiKey.substring(0, 5) + "..." + serpApiKey.substring(serpApiKey.length - 5) + ")" : "NOT CONFIGURED"}`);
  
  if (serpApiKey) {
    try {
      const url = `https://serpapi.com/search.json?q=test&api_key=${serpApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok) {
        if (data.error) {
          console.error(`❌ SerpAPI Key is INVALID. API returned error: "${data.error}"`);
        } else {
          console.log("✅ SerpAPI Key is WORKING!");
        }
      } else {
        console.error(`❌ SerpAPI Request Failed with status ${res.status}:`, data.error || data);
      }
    } catch (err) {
      console.error("❌ SerpAPI Request failed due to connection/network error:", err.message);
    }
  } else {
    console.warn("⚠️ SerpAPI Key is missing in .env.");
  }

  // 2. Test OpenAI / ModelFarm Key
  const openAiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const openAiBaseUrl = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  console.log(`\n[2/2] OpenAI/ModelFarm Key: ${openAiApiKey ? "Configured" : "NOT CONFIGURED"}`);
  console.log(`      OpenAI Base URL: ${openAiBaseUrl || "Default (api.openai.com)"}`);

  if (openAiApiKey) {
    if (openAiApiKey === "_DUMMY_API_KEY_") {
      console.warn("⚠️ OpenAI Key is set to '_DUMMY_API_KEY_'. This is a placeholder and will not work with real OpenAI endpoints.");
    }

    const openai = new OpenAI({
      apiKey: openAiApiKey,
      ...(openAiBaseUrl ? { baseURL: openAiBaseUrl } : {}),
    });

    try {
      console.log("   Sending test completion request (model: gpt-4o-mini)...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 10,
        messages: [{ role: "user", content: "Say 'working'" }],
      });
      
      const reply = response.choices[0]?.message?.content?.trim();
      console.log(`✅ OpenAI/ModelFarm is WORKING! Response: "${reply}"`);
    } catch (err) {
      console.error("❌ OpenAI/ModelFarm request failed:", err.message);
      
      // Let's also test direct OpenAI if a real key is present but base URL was overwritten
      if (openAiBaseUrl && openAiApiKey !== "_DUMMY_API_KEY_") {
        console.log("   Retrying directly with official OpenAI API endpoint (bypassing base URL)...");
        try {
          const directOpenai = new OpenAI({ apiKey: openAiApiKey });
          const response = await directOpenai.chat.completions.create({
            model: "gpt-4o-mini",
            max_completion_tokens: 10,
            messages: [{ role: "user", content: "Say 'working'" }],
          });
          const reply = response.choices[0]?.message?.content?.trim();
          console.log(`✅ Direct OpenAI is WORKING! Response: "${reply}"`);
        } catch (directErr) {
          console.error("❌ Direct OpenAI request also failed:", directErr.message);
        }
      }
    }
  } else {
    console.warn("⚠️ OpenAI API Key is missing in .env.");
  }

  console.log("\n=========================");
}

testKeys();
