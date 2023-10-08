"use server"

import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractCurrency, extractDescription, extractPrice } from '../utils';

interface ProductData {
  url: string;
  currency: string;
  image: string;
  title: string;
  currentPrice: number;
  originalPrice: number;
  priceHistory: number[];
  discountRate: number;
  category: string;
  reviewsCount: number;
  stars: number;
  isOutOfStock: boolean;
  description: string;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
}
interface PriceDetail {
  value: number;
  currency: string;
}

interface ProductImage {
  url: string;
}

interface Review {
  count: number;
  stars: number;
}

interface PriceHistoryItem {
  price: PriceDetail;
  date: Date;
}

interface Product {
  url: string;
  image: ProductImage;
  title: string;
  currentPrice: PriceDetail;
  originalPrice: PriceDetail;
  priceHistory: PriceHistoryItem[];
  discountRate: number;
  category: string;
  reviews: Review;
  isOutOfStock: boolean;
  description: string;
  lowestPrice: PriceDetail;
  highestPrice: PriceDetail;
  averagePrice: PriceDetail;
}

/**
  * Scrapes information from an Amazon product page.
  * @param url - The URL of the Amazon product page.
  * @returns An object containing the scraped information from the product page.
*/
export async function scrapeAmazonProduct(url: string): Promise<ProductData | undefined> {
  if(!url) return;

  // BrightData proxy config
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: 'brd.superproxy.io',
    port,
    rejectUnauthorized: false,
  }

  try {
    // Fetch the product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    // Extract the product title
    const title = $('#productTitle').text().trim();
  
    const currentPrice = extractPrice($('.priceToPay span.a-price-whole'), $('.a.size.base.a-color-price'),$('.a-button-selected .a-color-base'),);

    // before any discount
    const originalPrice = extractPrice($('#priceblock_ourprice'),$('.a-price.a-text-price span.a-offscreen'),$('#listPrice'),$('#priceblock_dealprice'),$('.a-size-base.a-color-price'));
    const outOfStock:boolean = $('#availability span').text().trim().toLowerCase() === 'currently unavailable';
    const images = $('#imgBlkFront').attr('data-a-dynamic-image') || $('#landingImage').attr('data-a-dynamic-image') || '{}'
    // parse the images
    const imageUrls = Object.keys(JSON.parse(images));
    // the symbol of the currency
    const currency = extractCurrency($('.a-price-symbol'))
    const discountRate = $('.savingsPercentage').text().replace(/[-%]/g, ""); // remove every thing that is not a percentage
    const description = extractDescription($)

    // Object with scraped information
    const data = {
      url,
      currency: currency || '$',
      image: imageUrls[0],
      title,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: 'category', //todo
      reviewsCount:100, //todo
      stars: 4.5, //todo
      isOutOfStock: outOfStock,
      description,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: Number(currentPrice) || Number(originalPrice),
    }

    return data;
  } catch (error: any) {
    console.log(error);
  }
}