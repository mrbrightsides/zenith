import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const zenithAgent = onRequest(
  {region: "asia-southeast1"},
  async (req, res) => {
    logger.info("ZENITH Agent triggered", {structuredData: true});

    res.json({
      status: "ZENITH LIVE backend active",
      timestamp: new Date().toISOString(),
      region: "asia-southeast1",
    });
  }
);
