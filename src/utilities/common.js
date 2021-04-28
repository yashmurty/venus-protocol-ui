import * as constants from 'utilities/constants';
import BigNumber from 'bignumber.js';

const ethers = require('ethers');
const commaNumber = require('comma-number');

const format = commaNumber.bindWith(',', '.');

export const encodeParameters = (types, values) => {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
};

export const getArgs = func => {
  // First match everything inside the function argument parens.
  const args = func.toString().match(/.*?\(([^)]*)\)/) ? func.toString().match(/.*?\(([^)]*)\)/)[1] : '';
  // Split the arguments string into an array comma delimited.
  return args
    .split(',')
    .map(arg => {
      // Ensure no inline comments are parsed and trim the whitespace.
      return arg.replace(/\/\*.*\*\//, '').trim();
    })
    .filter(arg => {
      // Ensure no undefined values are added.
      return arg;
    });
};

export const checkIsValidNetwork = (walletType = 'metamask') => {
  if (window.ethereum) {
    let netId;
    if (walletType === 'binance' && window.BinanceChain) {
      netId = +window.BinanceChain.chainId;
    } else if (window.ethereum) {
      netId = window.ethereum.networkVersion ? +window.ethereum.networkVersion : +window.ethereum.chainId
    }
    if (netId) {
      if (netId === 97 || netId === 56) {
        if (netId === 97 && process.env.REACT_APP_ENV === 'prod') {
          return false;
        }
        if (netId === 56 && process.env.REACT_APP_ENV === 'dev') {
          return false;
        }
        return true;
      }
      return false;
    }
  }
  return false;
};

export const addToken = async (asset = 'vai', decimal, type) => {
  let tokenAddress = '';
  let tokenSymbol = '';
  let tokenDecimals = 18;
  let tokenImage = '';
  if (asset === 'vai') {
    tokenAddress = constants.CONTRACT_VAI_TOKEN_ADDRESS;
    tokenSymbol = 'VAI';
    tokenDecimals = 18;
    tokenImage = `${window.location.origin}/coins/vai.svg`;
  } else {
    tokenAddress =
      type === 'token'
        ? constants.CONTRACT_TOKEN_ADDRESS[asset].address
        : constants.CONTRACT_VBEP_ADDRESS[asset].address;
    tokenSymbol = type === 'token' ? asset.toUpperCase() : `v${(asset === 'btcb' ? 'btc' : asset).toUpperCase()}`;
    tokenDecimals = decimal || (type === 'token' ? 18 : 8);
    tokenImage = `${window.location.origin}/coins/${type === 'token' ? asset : `v${asset === 'btcb' ? 'btc' : asset}`}.png`;
  }

  try {
    // wasAdded is a boolean. Like any RPC method, an error may be thrown.
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20', // Initially only supports ERC20, but eventually more!
        options: {
          address: tokenAddress, // The address that the token is at.
          symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 chars.
          decimals: tokenDecimals, // The number of decimals in the token
          image: tokenImage // A string url of the token logo
        }
      }
    });

    if (wasAdded) {
      console.log('Thanks for your interest!');
    } else {
      console.log('Your loss!');
    }
  } catch (error) {
    console.log(error);
  }
};

export const getBigNumber = value => {
  if (!value) {
    return new BigNumber(0);
  }
  if (BigNumber.isBigNumber(value)) {
    return value;
  }
  return new BigNumber(value);
};

export const currencyFormatter = labelValue => {
  // Nine Zeroes for Billions
  return Math.abs(Number(labelValue)) >= 1.0e+9

  ? `$${format(new BigNumber(`${Math.abs(Number(labelValue)) / 1.0e+9}`).dp(2, 1))}B`
  // Six Zeroes for Millions 
  : Math.abs(Number(labelValue)) >= 1.0e+6

  ? `$${format(new BigNumber(`${Math.abs(Number(labelValue)) / 1.0e+6}`).dp(2, 1))}M`
  // Three Zeroes for Thousands
  : Math.abs(Number(labelValue)) >= 1.0e+3

  ? `$${format(new BigNumber(`${Math.abs(Number(labelValue)) / 1.0e+3}`).dp(2, 1))}K`

  : `$${format(new BigNumber(`${Math.abs(Number(labelValue))}`).dp(2, 1))}`;
};
