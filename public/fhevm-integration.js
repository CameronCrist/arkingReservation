/**
 * FHEVM Integration Module
 * Demonstrates proper fhevmjs integration for encrypted operations
 * Includes input proof generation (ZKPoK) and Gateway interaction
 */

import { initFhevm, createInstance } from "fhevmjs";

class FHEVMIntegration {
  constructor() {
    this.instance = null;
    this.provider = null;
    this.signer = null;
    this.contractAddress = null;
    this.contract = null;
    this.initialized = false;
  }

  /**
   * Initialize FHEVM instance
   * @param {object} provider - Ethers provider
   * @param {string} contractAddress - Contract address
   * @param {object} contractABI - Contract ABI
   */
  async initialize(provider, contractAddress, contractABI) {
    try {
      console.log("Initializing FHEVM...");

      this.provider = provider;
      this.signer = await provider.getSigner();
      this.contractAddress = contractAddress;

      // Initialize fhevmjs
      await initFhevm();

      // Get network information
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Get public key from contract
      const publicKeyResponse = await provider.call({
        to: contractAddress,
        data: "0x...", // getFHEPublicKey selector
      });

      // Create FHE instance
      this.instance = await createInstance({
        chainId: chainId,
        publicKey: publicKeyResponse,
        gatewayUrl: "https://gateway.zama.ai", // Gateway URL for decryption
      });

      // Create contract instance
      this.contract = new ethers.Contract(
        contractAddress,
        contractABI,
        this.signer
      );

      this.initialized = true;
      console.log("FHEVM initialized successfully");

      return true;
    } catch (error) {
      console.error("FHEVM initialization failed:", error);
      throw error;
    }
  }

  /**
   * Generate encrypted input with proof (ZKPoK)
   * @param {number} value - Plain value to encrypt
   * @param {string} type - FHE type (euint32, euint64, ebool)
   * @returns {object} Encrypted input and proof
   */
  async createEncryptedInput(value, type = "euint32") {
    if (!this.initialized) {
      throw new Error("FHEVM not initialized");
    }

    try {
      // Create encrypted input
      const encryptedInput = this.instance.createEncryptedInput(
        this.contractAddress,
        await this.signer.getAddress()
      );

      // Add the value based on type
      switch (type) {
        case "euint8":
          encryptedInput.add8(value);
          break;
        case "euint16":
          encryptedInput.add16(value);
          break;
        case "euint32":
          encryptedInput.add32(value);
          break;
        case "euint64":
          encryptedInput.add64(value);
          break;
        case "ebool":
          encryptedInput.addBool(value);
          break;
        default:
          throw new Error(`Unsupported type: ${type}`);
      }

      // Generate proof (ZKPoK - Zero-Knowledge Proof of Knowledge)
      const encrypted = encryptedInput.encrypt();

      return {
        handles: encrypted.handles,
        inputProof: encrypted.inputProof,
      };
    } catch (error) {
      console.error("Encrypted input creation failed:", error);
      throw error;
    }
  }

  /**
   * Register user with encrypted credentials
   * @param {object} userData - User registration data
   */
  async registerUser(userData) {
    if (!this.initialized) {
      throw new Error("FHEVM not initialized");
    }

    try {
      console.log("Registering user with encrypted data...");

      // Create encrypted inputs for user data
      const encUserId = await this.createEncryptedInput(
        userData.userId,
        "euint32"
      );
      const encCreditScore = await this.createEncryptedInput(
        userData.creditScore,
        "euint32"
      );
      const encHasLicense = await this.createEncryptedInput(
        userData.hasLicense,
        "ebool"
      );
      const encBalance = await this.createEncryptedInput(
        userData.initialBalance,
        "euint64"
      );

      // Combine all encrypted inputs
      const encryptedInput = this.instance.createEncryptedInput(
        this.contractAddress,
        await this.signer.getAddress()
      );

      encryptedInput.add32(userData.userId);
      encryptedInput.add32(userData.creditScore);
      encryptedInput.addBool(userData.hasLicense);
      encryptedInput.add64(userData.initialBalance);

      const { handles, inputProof } = encryptedInput.encrypt();

      // Call contract with encrypted inputs and proof
      const tx = await this.contract.registerUser(
        handles[0], // encryptedUserId
        handles[1], // encryptedCreditScore
        handles[2], // hasLicense
        handles[3], // initialBalance
        inputProof
      );

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("User registered successfully!");

      return receipt;
    } catch (error) {
      console.error("User registration failed:", error);
      throw error;
    }
  }

  /**
   * Reserve parking spot with encrypted payment
   * @param {object} reservationData - Reservation details
   */
  async reserveSpot(reservationData) {
    if (!this.initialized) {
      throw new Error("FHEVM not initialized");
    }

    try {
      console.log("Creating reservation with encrypted data...");

      // Create encrypted input for reservation
      const encryptedInput = this.instance.createEncryptedInput(
        this.contractAddress,
        await this.signer.getAddress()
      );

      encryptedInput.add64(reservationData.duration); // Duration in seconds
      encryptedInput.add32(reservationData.paymentAmount);

      const { handles, inputProof } = encryptedInput.encrypt();

      // Call contract
      const tx = await this.contract.reserveSpot(
        reservationData.spotId,
        handles[0], // encryptedDuration
        handles[1], // encryptedPayment
        inputProof
      );

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();

      // Extract reservation ID from events
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "ReservationCreated"
      );

      const reservationId = event ? event.args[0] : null;
      console.log("Reservation created:", reservationId);

      return { receipt, reservationId };
    } catch (error) {
      console.error("Reservation failed:", error);
      throw error;
    }
  }

  /**
   * Request Gateway decryption for encrypted data
   * @param {string} functionName - Contract function to call
   * @param {array} args - Function arguments
   */
  async requestDecryption(functionName, args = []) {
    if (!this.initialized) {
      throw new Error("FHEVM not initialized");
    }

    try {
      console.log(`Requesting decryption for ${functionName}...`);

      // Call the request function
      const tx = await this.contract[functionName](...args);
      const receipt = await tx.wait();

      // Extract request ID from events
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "GatewayRequestInitiated"
      );

      const requestId = event ? event.args[0] : null;
      console.log("Gateway request initiated:", requestId);

      return { receipt, requestId };
    } catch (error) {
      console.error("Decryption request failed:", error);
      throw error;
    }
  }

  /**
   * Wait for Gateway callback completion
   * @param {number} requestId - Gateway request ID
   * @param {number} maxWaitTime - Maximum wait time in milliseconds
   */
  async waitForGatewayCallback(requestId, maxWaitTime = 120000) {
    if (!this.initialized) {
      throw new Error("FHEVM not initialized");
    }

    console.log(`Waiting for Gateway callback (request ${requestId})...`);

    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Listen for GatewayRequestFulfilled event
        const filter = this.contract.filters.GatewayRequestFulfilled(requestId);
        const events = await this.contract.queryFilter(filter);

        if (events.length > 0) {
          const event = events[0];
          console.log("Gateway callback received!");
          return {
            fulfilled: true,
            success: event.args.success,
            blockNumber: event.blockNumber,
          };
        }
      } catch (error) {
        console.error("Error checking callback status:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Gateway callback timeout");
  }

  /**
   * Decrypt encrypted contract data (requires permission)
   * @param {string} contractAddress - Contract address
   * @param {string} handle - Encrypted data handle
   * @returns {number} Decrypted value
   */
  async decrypt(contractAddress, handle) {
    if (!this.initialized) {
      throw new Error("FHEVM not initialized");
    }

    try {
      // Request reencryption for user's public key
      const userAddress = await this.signer.getAddress();

      // Generate EIP-712 signature for reencryption
      const eip712 = this.instance.createEIP712(handle, contractAddress);
      const signature = await this.signer.signTypedData(
        eip712.domain,
        { Reencrypt: eip712.types.Reencrypt },
        eip712.message
      );

      // Request reencryption from Gateway
      const decrypted = await this.instance.reencrypt(
        handle,
        contractAddress,
        userAddress,
        signature
      );

      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      throw error;
    }
  }
}

// Export for use in main application
export default FHEVMIntegration;

// Example usage:
/*
const fhevm = new FHEVMIntegration();

// Initialize
await fhevm.initialize(provider, contractAddress, contractABI);

// Register user
await fhevm.registerUser({
  userId: 12345,
  creditScore: 750,
  hasLicense: true,
  initialBalance: 10000
});

// Reserve spot
const { reservationId } = await fhevm.reserveSpot({
  spotId: 0,
  duration: 3600, // 1 hour
  paymentAmount: 100
});

// Request approval decryption
const { requestId } = await fhevm.requestDecryption(
  'requestReservationApproval',
  [reservationId]
);

// Wait for Gateway callback
const result = await fhevm.waitForGatewayCallback(requestId);
console.log('Approval result:', result.success);
*/
