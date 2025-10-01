const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");
const readline = require("readline");
const user_agents = require("./config/userAgents");
const settings = require("./config/config.js");
const { sleep, loadData, getRandomNumber, saveToken, isTokenExpired, saveJson, getRandomElement, generateId } = require("./utils/utils.js");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const { checkBaseUrl } = require("./utils/checkAPI.js");
const { headers } = require("./core/header.js");
const { showBanner } = require("./core/banner.js");
const localStorage = require("./localStorage.json");
const ethers = require("ethers");
const { solveCaptcha } = require("./utils/captcha.js");
const { jwtDecode } = require("jwt-decode");
const Helper = require("./helper/helper.js");
const Onchain = require("./onchain/onchain.js");
const questions = loadData("questions.txt");
const emails = [];
const twitters = [];
const agents = require("./agens.json");
const refcodes = loadData("refcodes.txt");
class ClientAPI {
  constructor(itemData, accountIndex, proxy, baseURL) {
    this.headers = headers;
    this.baseURL = settings.BASE_URL;
    this.baseURL_v2 = "";
    this.localItem = null;
    this.itemData = itemData;
    this.accountIndex = accountIndex;
    this.proxy = proxy;
    this.proxyIP = null;
    this.session_name = null;
    this.session_user_agents = this.#load_session_data();
    this.token = null;
    this.localStorage = localStorage;
    this.wallet = new ethers.Wallet(this.itemData.privateKey);
    this.provider = new ethers.JsonRpcProvider(settings.RPC_URL);
    this.apiKey = null;
    this.userData = null;
    this.onService = new Onchain({ wallet: this.wallet, provider: this.provider });
  }

  #load_session_data() {
    try {
      const filePath = path.join(process.cwd(), "session_user_agents.json");
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      } else {
        throw error;
      }
    }
  }

  #get_random_user_agent() {
    const randomIndex = Math.floor(Math.random() * user_agents.length);
    return user_agents[randomIndex];
  }

  #get_user_agent() {
    if (this.session_user_agents[this.session_name]) {
      return this.session_user_agents[this.session_name];
    }

    const newUserAgent = this.#get_random_user_agent();
    this.session_user_agents[this.session_name] = newUserAgent;
    this.#save_session_data(this.session_user_agents);
    return newUserAgent;
  }

  #save_session_data(session_user_agents) {
    const filePath = path.join(process.cwd(), "session_user_agents.json");
    fs.writeFileSync(filePath, JSON.stringify(session_user_agents, null, 2));
  }

  #get_platform(userAgent) {
    const platformPatterns = [
      { pattern: /iPhone/i, platform: "ios" },
      { pattern: /Android/i, platform: "android" },
      { pattern: /iPad/i, platform: "ios" },
    ];

    for (const { pattern, platform } of platformPatterns) {
      if (pattern.test(userAgent)) {
        return platform;
      }
    }

    return "Unknown";
  }

  #set_headers() {
    const platform = this.#get_platform(this.#get_user_agent());
    this.headers["sec-ch-ua"] = `Not)A;Brand";v="99", "${platform} WebView";v="127", "Chromium";v="127`;
    this.headers["sec-ch-ua-platform"] = platform;
    this.headers["User-Agent"] = this.#get_user_agent();
  }

  createUserAgent() {
    try {
      this.session_name = this.itemData.address;
      this.#get_user_agent();
    } catch (error) {
      this.log(`Can't create user agent: ${error.message}`, "error");
      return;
    }
  }

  async log(msg, type = "info") {
    const accountPrefix = `[ChainOpera][${this.accountIndex + 1}][${this.itemData.address}]`;
    let ipPrefix = "[Local IP]";
    if (settings.USE_PROXY) {
      ipPrefix = this.proxyIP ? `[${this.proxyIP}]` : "[Unknown IP]";
    }
    let logMessage = "";

    switch (type) {
      case "success":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.green;
        break;
      case "error":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.red;
        break;
      case "warning":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.yellow;
        break;
      case "custom":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.magenta;
        break;
      default:
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.blue;
    }
    console.log(logMessage);
  }

  async checkProxyIP() {
    try {
      const proxyAgent = new HttpsProxyAgent(this.proxy);
      const response = await axios.get("https://api.ipify.org?format=json", { httpsAgent: proxyAgent });
      if (response.status === 200) {
        this.proxyIP = response.data.ip;
        return response.data.ip;
      } else {
        throw new Error(`Cannot check proxy IP. Status code: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Error checking proxy IP: ${error.message}`);
    }
  }

  async makeRequest(
    url,
    method,
    data = {},
    options = {
      retries: 2,
      isAuth: false,
      extraHeaders: {},
      refreshToken: null,
    }
  ) {
    const { retries, isAuth, extraHeaders, refreshToken } = options;

    const headers = {
      ...this.headers,
      ...extraHeaders,
    };

    if (!isAuth && this.token) {
      headers["cookie"] = `auth_token=${this.token}`;
      headers["authorization"] = `${this.token}`;
      headers["token"] = `${this.token}`;
    }

    let proxyAgent = null;
    if (settings.USE_PROXY) {
      proxyAgent = new HttpsProxyAgent(this.proxy);
    }
    let currRetries = 0,
      errorMessage = null,
      errorStatus = 0;

    do {
      try {
        const response = await axios({
          method,
          url,
          headers,
          timeout: 120000,
          ...(proxyAgent ? { httpsAgent: proxyAgent, httpAgent: proxyAgent } : {}),
          ...(method.toLowerCase() != "get" ? { data } : {}),
        });
        if (response?.data?.data) return { status: response.status, success: true, data: response.data.data, error: null };
        return { success: true, data: response.data, status: response.status, error: null };
      } catch (error) {
        errorStatus = error.status;
        errorMessage = error?.response?.data?.message ? error?.response?.data : error.message;
        // this.log(`Request failed: ${url} | Status: ${error.status} | ${JSON.stringify(errorMessage || {})}...`, "warning");

        if (error.message.includes("stream has been aborted")) {
          return { success: false, status: error.status, data: null, error: error.response.data.error || error.response.data.message || error.message };
        }

        if (error.status == 401) {
          this.log(`Unauthorized, token expried`, "warning");
          await sleep(1);
          process.exit(0);
        }
        if (error.status == 400) {
          this.log(`Invalid request for ${url}, maybe have new update from server | contact: https://t.me/airdrophuntersieutoc to get new update!`, "error");
          return { success: false, status: error.status, error: errorMessage, data: null };
        }
        if (error.status == 429) {
          this.log(`Rate limit ${JSON.stringify(errorMessage)}, waiting 60s to retries`, "warning");
          await sleep(60);
        }
        if (currRetries > retries) {
          return { status: error.status, success: false, error: errorMessage, data: null };
        }
        currRetries++;
        await sleep(5);
      }
    } while (currRetries <= retries);
    return { status: errorStatus, success: false, error: errorMessage, data: null };
  }

  getCookieData(setCookie) {
    try {
      if (!(setCookie?.length > 0)) return null;
      let cookie = [];
      const item = JSON.stringify(setCookie);
      // const item =
      const nonceMatch = item.match(/user=([^;]+)/);
      if (nonceMatch && nonceMatch[0]) {
        cookie.push(nonceMatch[0]);
      }

      const data = cookie.join(";");
      return cookie.length > 0 ? data : null;
    } catch (error) {
      this.log(`Error get cookie: ${error.message}`, "error");
      return null;
    }
  }

  async auth() {
    const res = await this.getNonce();
    if (!res?.data) {
      this.log(`Can't get nonce`, "warning");
      await sleep(1);
      process.exit(1);
    }
    const { nonce } = res.data;
    const mess = `chat.chainopera.ai wants you to sign in with your Ethereum account:
${this.wallet.address}

Sign in with Ethereum to the app.

URI: https://chat.chainopera.ai
Version: 1
Chain ID: 688688
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;
    const signedMessage = await this.wallet.signMessage(mess);
    const payload = {
      siweMessage: mess,
      address: this.itemData.address,
      loginChannel: 4,
      version: "v1",
    };
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/client/user/login`, "post", payload, {
      isAuth: true,
      extraHeaders: {
        sign: signedMessage,
      },
    });
  }

  // async register() {
  //   this.log(`Registing...`);
  //   const res = await this.getNonce();
  //   if (!res?.data) return { success: false, error: "Can't get nonce" };
  //   const signedMessage = await this.wallet.signMessage(res.data);
  //   const payload = {
  //     siweMessage: res.data,
  //     address: this.itemData.address,
  //     loginChannel: 4,
  //   };
  //   return this.makeRequest(`${settings.BASE_URL_V2}/userCenter/api/v1/client/user/login`, "post", payload, {
  //     isAuth: true,
  //     extraHeaders: {
  //       sign: signedMessage,
  //     },
  //   });
  // }

  async getNonce() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/wallet/getNonce`, "get", null, { isAuth: true });
  }

  async getUserData() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/client/user/getCurrentAccount`, "get");
  }

  async getBalance() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/ai/terminal/getPoints`, "get");
  }

  async checkin(payload) {
    //  userCenter/api/v1/ai/terminal/checkIn-v1
    // api/agent/ai-terminal-check-in
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/ai/terminal/checkIn-v2`, "post", payload);
  }

  async getCheckin() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/ai/terminal/getSignInRecords`, "get");
  }

  async getInviteStatus() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/client/points/getInvitationStatus`, "get");
  }

  async bindCode() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/client/points/enterInviteCode`, "post", {
      code: getRandomElement(refcodes) || "URT45769",
    });
  }

  async getPowchangeId(message) {
    //  "challenge_id": "29e150bea60be19f4107825ddee7af9f25727d20b7096c2530ad1b0b0b78b5cf",
    //   "prompt": "What are the top trending DeFi pools tokens?",
    //   "salt": "hda3zp09",
    //   "timestamp": 1753035228,
    //   "difficulty": 3,
    //   "target_prefix": "000"
    return this.makeRequest(`${this.baseURL}/api/agentopera/pow-challenge?prompt=${encodeURIComponent(message)}&llmApiKey=sk-${this.apiKey}&identifier=${this.userData?.id}`, "get", null);
  }

  async getListSubsAgent() {
    return this.makeRequest(`https://chat.chainopera.ai/agentapi/agent-subs/list`, "get");
  }

  async getLimit() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/ai/terminal/getPromptPoints`, "get");
  }

  async getLimitInteraction() {
    return this.makeRequest(`${this.baseURL}/userCenter/api/v1/client/points/interaction/getPoints`, "get");
  }

  async sendMess(payload, mess) {
    const resPow = await this.getPowchangeId(mess);
    if (!resPow) {
      this.log(`Can't get pow id for mess: ${mess}`, "warning");
      return { success: false };
    }
    const { target_prefix, difficulty, challenge_id, salt, timestamp, prompt } = resPow.data;
    const nonce = await Helper.getNonce(prompt, salt, timestamp, difficulty);
    return this.makeRequest(`${this.baseURL}/api/agentopera`, "post", payload, {
      extraHeaders: {
        "x-llm-api-key": `sk-${this.apiKey}`,
        "x-terminal-source": 2,
        "x-pow-challenge-id": challenge_id,
        "x-pow-difficulty": difficulty,
        "x-pow-nonce": nonce,
      },
    });
  }

  async getWaitingList() {
    return this.makeRequest(`${settings.BASE_URL_V2}/userCenter/api/v1/activity/waitingList?walletId=${this.itemData.address}`, "get", null, {
      extraHeaders: {
        origin: "https://chainopera.ai",
      },
    });
  }

  async joinWaiting() {
    const email = getRandomElement(emails) || "duymmo@gmail.com";
    return this.makeRequest(
      `${settings.BASE_URL_V2}/userCenter/api/v1/activity/joinTheWaitingList`,
      "post",
      {
        walletId: this.itemData.address,
        information: {
          email: email,
          role: "AI End User,AI Coin Traders,AI Application Developers",
          privacy: true,
        },
      },
      {
        extraHeaders: {
          origin: "https://chainopera.ai",
        },
      }
    );
  }

  async updateX() {
    const twitter = twitters[this.accountIndex] || getRandomElement(twitters);
    return this.makeRequest(
      `${settings.BASE_URL_V2}/userCenter/api/v1/twitter/updateXUserName`,
      "post",
      {
        walletId: this.itemData.address,
        userName: twitter.startsWith("@") ? twitter : `@${twitter}`,
      },
      {
        extraHeaders: {
          origin: "https://chainopera.ai",
        },
      }
    );
  }

  async handleInteractionAgent() {}

  async handleBindCode() {
    const resGet = await this.getInviteStatus();
    if (!resGet.success) return;
    const cantBind = resGet.data;
    if (cantBind == true) {
      const res = await this.bindCode();
      if (res.success) {
        this.log(`Apply ref code success!`, "success");
      }
    }
  }

  async getValidToken(isNew = false) {
    const existingToken = this.token;
    const { isExpired: isExp, expirationDate } = isTokenExpired(existingToken);

    this.log(`Access token status: ${isExp ? "Expired".yellow : "Valid".green} | Acess token exp: ${expirationDate}`);
    if (existingToken && !isNew && !isExp) {
      this.log("Using valid token", "success");
      return existingToken;
    }

    this.log("No found token or experied, trying get new token...", "warning");
    const loginRes = await this.auth();
    if (!loginRes.success) {
      this.log(`Auth failed: ${JSON.stringify(loginRes)}`, "error");
      return null;
    }
    const newToken = loginRes.data;
    if (newToken?.token) {
      await saveJson(this.session_name, JSON.stringify(newToken), "localStorage.json");
      this.localItem = newToken;
      return newToken.token;
    }
    this.log("Can't get new token...", "warning");
    return null;
  }

  isCheckInAvailableToday(data) {
    const signInRecords = data.signInRecords;
    const utcTime = data.utcTime;
    if (!signInRecords || signInRecords.length === 0) {
      return true; // No sign-in records, so check-in is available
    }
    const hasRecordToday = signInRecords.find((r) => r.dayTime == utcTime);
    if (hasRecordToday) {
      return false;
    }
    return true;
  }

  async handleMess(userData) {
    const [resGet, resInterGet] = await Promise.all([this.getLimit(), this.getLimitInteraction()]);
    let limit = 0;
    let total = 1;
    let currInter = 0;

    const ratio = resGet.data.pointsRatio || 0;
    const ratioInter = resInterGet.data.pointsRatio || 0;

    this.log(`Points prompts earned today ${ratio * 100}% | Points interaction earned today ${ratioInter * 100}%`, "custom");
    if (ratio == 1 && ratioInter == 1) {
      return this.log(`Max prompt chat today!`, "warning");
    }

    limit = ratio < 1 ? ratio : ratioInter;

    let allAgentName = agents.map((e) => e.agentName).filter((e) => e !== null);
    let agentName = getRandomElement(allAgentName);
    while (limit < 1) {
      const limitFomated = limit.toFixed(1);
      if (currInter % 3 == 0 && currInter > 0) {
        allAgentName = allAgentName.filter((e) => e !== agentName);
        agentName = getRandomElement(allAgentName);
      }
      this.log(`Using agent name: ${agentName}`, "custom");
      const mess = getRandomElement(questions);
      const payload = {
        id: generateId(),
        messages: [
          {
            role: "user",
            content: mess,
            parts: [
              {
                type: "text",
                text: mess,
              },
            ],
          },
        ],
        userId: userData.id,
        model: "chainopera-default",
        group: "web",
        agentName: agentName,
      };
      this.log(`[${limitFomated}/${total}] Sending mess: ${mess}`);
      const res = await this.sendMess(payload, mess);
      if (res.success) {
        this.log(`[${limitFomated}/${total}] Sent ${mess} success!`, "success");
      } else {
        this.log(`[${limitFomated}/${total}] Sent message ${mess} failed | ${JSON.stringify(res)}`, "warning");
      }
      if (limit < 1) {
        const timeSleep = getRandomNumber(settings.DELAY_CHAT[0], settings.DELAY_CHAT[1]);
        this.log(`Sleeping for ${timeSleep} seconds to next message...`, "info");
        await sleep(timeSleep);
      }
      limit += 0.1;
      currInter++;
    }
  }
  async handleCheckin() {
    const resGet = await this.getCheckin();
    if (!resGet.success) return;
    const isAvaliable = this.isCheckInAvailableToday(resGet.data);
    if (isAvaliable) {
      this.log(`Sending BNB to checkin...`);
      const resOnchain = await this.onService.checkin();

      if (resOnchain.success) {
        const payload = {
          transactionHash: resOnchain.tx,
          chainId: 56,
        };

        const resCheckin = await this.checkin(payload);

        if (resCheckin.success) {
          this.log(`Checkin success!`, "success");
        } else {
          this.log(`Failed checkin ${JSON.stringify(resCheckin)}`, "warning");
        }
      } else {
        this.log(resOnchain.message, "warning");
      }
    } else {
      return this.log(`You checked in today!`, "warning");
    }
  }

  async connectRPC() {
    try {
      const provider = new ethers.JsonRpcProvider(settings.RPC_URL, {
        fetch: (url, options) => {
          options.headers = {
            ...(options.headers || {}),
          };

          if (settings.USE_PROXY) options.agent = new HttpsProxyAgent(this.proxy);
          return fetch(url, options);
        },
        chainId: 56,
        name: "BNB Smart Chain",
      });
      const wallet = new ethers.Wallet(this.itemData.privateKey, this.provider);
      this.wallet = wallet;
      this.provider = provider;
      this.onService = new Onchain({ wallet, provider });
      const block = await provider.getBlockNumber();
      this.log(`Connected to block: ${block}`, "success");
    } catch (error) {
      this.log(`Can't connect RPC: ${settings.RPC_URL}`, "error");
    }
  }

  async getBNBPrice() {
    try {
      let agent = this.proxy ? new HttpsProxyAgent(this.proxy) : null;
      const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd", {
        httpAgent: agent,
        httpsAgent: agent,
      });
      return response.data.binancecoin.usd;
    } catch (error) {
      return null;
    }
  }

  async handleSyncData() {
    this.log(`Sync data...`);
    let userData = { success: false, data: null, status: 0 },
      retries = 0;

    do {
      userData = await this.getUserData();
      if (userData?.success) break;
      retries++;
    } while (retries < 1 && userData.status !== 400);
    // if (userData?.data?.token) {
    //   await saveJson(this.session_name, JSON.stringify(userData.data.token), "localStorage.json");
    //   this.localItem = userData.data;
    //   this.token = userData.data.token;
    // }
    const blance = await this.getBalance();
    const bnb = await this.onService.checkBalance({ provider: this.provider, wallet: this.wallet });

    if (userData?.success) {
      const { apiKey } = userData.data;
      this.userData = userData.data;
      const { todayPoints, totalPoints } = blance.data;

      this.apiKey = apiKey;
      this.log(`BNB: ${bnb} | Today erning: ${todayPoints} | Total points: ${totalPoints}`, "custom");
    } else {
      this.log("Can't sync new data...skipping", "warning");
    }
    return userData;
  }

  async runAccount() {
    const accountIndex = this.accountIndex;
    this.session_name = this.itemData.address;
    this.localItem = JSON.parse(this.localStorage[this.session_name] || "{}");
    this.token = this.localItem?.token;
    this.#set_headers();
    if (settings.USE_PROXY) {
      try {
        this.proxyIP = await this.checkProxyIP();
      } catch (error) {
        this.log(`Cannot check proxy IP: ${error.message}`, "warning");
        return;
      }
      const timesleep = getRandomNumber(settings.DELAY_START_BOT[0], settings.DELAY_START_BOT[1]);
      console.log(`=========Tài khoản ${accountIndex + 1} | ${this.proxyIP} | Bắt đầu sau ${timesleep} giây...`.green);
      await sleep(timesleep);
    }

    const token = await this.getValidToken();
    if (!token) return;
    this.token = token;
    await this.connectRPC();
    const userData = await this.handleSyncData();
    await this.handleBindCode();
    if (userData.success) {
      if (settings.AUTO_CHECKIN) {
        await sleep(1);
        await this.handleCheckin();
      }
      if (settings.AUTO_CHAT) {
        await sleep(1);
        await this.handleMess(userData.data);
      }
    } else {
      return this.log("Can't get use info...skipping", "error");
    }
  }
}

async function runWorker(workerData) {
  const { itemData, accountIndex, proxy, hasIDAPI } = workerData;
  const to = new ClientAPI(itemData, accountIndex, proxy, hasIDAPI);
  try {
    await Promise.race([to.runAccount(), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 24 * 60 * 60 * 1000))]);
    parentPort.postMessage({
      accountIndex,
    });
  } catch (error) {
    parentPort.postMessage({ accountIndex, error: error.message });
  } finally {
    if (!isMainThread) {
      parentPort.postMessage("taskComplete");
    }
  }
}

async function main() {
  console.clear();
  showBanner();
  const privateKeys = loadData("privateKeys.txt");
  const proxies = loadData("proxy.txt");

  if (privateKeys.length == 0 || (privateKeys.length > proxies.length && settings.USE_PROXY)) {
    console.log("Số lượng proxy và data phải bằng nhau.".red);
    console.log(`Data: ${privateKeys.length}`);
    console.log(`Proxy: ${proxies.length}`);
    process.exit(1);
  }
  if (!settings.USE_PROXY) {
    console.log(`You are running bot without proxies!!!`.yellow);
  }
  let maxThreads = settings.USE_PROXY ? settings.MAX_THEADS : settings.MAX_THEADS_NO_PROXY;

  const resCheck = await checkBaseUrl();
  if (!resCheck.endpoint) return console.log(`Không thể tìm thấy ID API, có thể lỗi kết nỗi, thử lại sau!`.red);
  console.log(`${resCheck.message}`.yellow);

  const data = privateKeys.map((val, index) => {
    const prvk = val.startsWith("0x") ? val : `0x${val}`;
    const wallet = new ethers.Wallet(prvk);
    const item = {
      address: wallet.address,
      privateKey: prvk,
    };
    new ClientAPI(item, index, proxies[index], resCheck.endpoint, {}).createUserAgent();
    return item;
  });
  await sleep(1);
  while (true) {
    let currentIndex = 0;
    const errors = [];
    while (currentIndex < data.length) {
      const workerPromises = [];
      const batchSize = Math.min(maxThreads, data.length - currentIndex);
      for (let i = 0; i < batchSize; i++) {
        const worker = new Worker(__filename, {
          workerData: {
            hasIDAPI: resCheck.endpoint,
            itemData: data[currentIndex],
            accountIndex: currentIndex,
            proxy: proxies[currentIndex % proxies.length],
          },
        });

        workerPromises.push(
          new Promise((resolve) => {
            worker.on("message", (message) => {
              if (message === "taskComplete") {
                worker.terminate();
              }
              if (settings.ENABLE_DEBUG) {
                console.log(message);
              }
              resolve();
            });
            worker.on("error", (error) => {
              console.log(`Lỗi worker cho tài khoản ${currentIndex}: ${error?.message}`);
              worker.terminate();
              resolve();
            });
            worker.on("exit", (code) => {
              if (code !== 0) {
                errors.push(`Worker cho tài khoản ${currentIndex} thoát với mã: ${code}`);
              }
              resolve();
            });
          })
        );

        currentIndex++;
      }

      await Promise.all(workerPromises);

      if (errors.length > 0) {
        errors.length = 0;
      }

      if (currentIndex < data.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    await sleep(3);
    console.log(`=============${new Date().toLocaleString()} | Hoàn thành tất cả tài khoản | Chờ ${settings.TIME_SLEEP} phút=============`.magenta);
    showBanner();
    await sleep(settings.TIME_SLEEP * 60);
  }
}

if (isMainThread) {
  main().catch((error) => {
    console.log("Lỗi rồi:", error);
    process.exit(1);
  });
} else {
  runWorker(workerData);
}
