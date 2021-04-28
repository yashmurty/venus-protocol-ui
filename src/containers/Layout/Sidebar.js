import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { compose } from 'recompose';
import { NavLink, withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { Select, Icon } from 'antd';
import BigNumber from 'bignumber.js';
import {
  getTokenContract,
  getVbepContract,
  getComptrollerContract,
  getVaiTokenContract,
  methods
} from 'utilities/ContractService';
import { promisify } from 'utilities';
import * as constants from 'utilities/constants';
import ConnectModal from 'components/Basic/ConnectModal';
import { Label } from 'components/Basic/Label';
import Button from '@material-ui/core/Button';
import { connectAccount, accountActionCreators } from 'core';
import MetaMaskClass from 'utilities/MetaMask';
import logoImg from 'assets/img/logo.png';
import commaNumber from 'comma-number';
import { checkIsValidNetwork, getBigNumber } from 'utilities/common';
import toast from 'components/Basic/Toast';
import XVSIcon from 'assets/img/venus.svg';
import XVSActiveIcon from 'assets/img/venus_active.svg';

const SidebarWrapper = styled.div`
  height: 100vh;
  min-width: 108px;
  border-radius: 25px;
  background-color: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  margin-right: 30px;

  @media only screen and (max-width: 768px) {
    display: flex;
    height: 60px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-right: 0px;
  }
`;

const Logo = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 54px;
  i {
    font-size: 18px;
  }

  @media only screen and (max-width: 768px) {
    padding: 0 20px;
    img {
      width: 60px;
    }
  }

  @media only screen and (max-width: 1280px) {
    i {
      font-size: 12px !important;
    }
    img {
      width: 80px !important;
    }
  }
`;

const MainMenu = styled.div`
  margin-top: 140px;

  @media only screen and (max-width: 768px) {
    margin: 0 20px;
  }

  .xvs-active-icon {
    display: none;
  }

  a {
    padding: 7px;
    i,
    img {
      width: 20%;
      margin: 0 10%;
      svg {
        fill: var(--color-text-main);
      }
    }
    img {
      width: 10%;
      margin: 0 13%;
    }
    span {
      width: 80%;
    }
    @media only screen and (max-width: 1440px) {
      span {
        font-size: 14px;
      }
    }

    @media only screen and (max-width: 1280px) {
      span {
        font-size: 12px;
      }
    }
    &:not(:last-child) {
      margin-bottom: 48px;
    }

    &:hover {
      svg {
        fill: var(--color-yellow);
      }
      span {
        color: var(--color-yellow);
      }
      .xvs-icon {
        display: none;
      }
      .xvs-active-icon {
        display: block;
      }
    }
  }

  .active {
    background-color: var(--color-bg-active);
    svg {
      fill: var(--color-yellow);
    }
    span {
      color: var(--color-yellow);
    }
    .xvs-icon {
      display: none;
    }
    .xvs-active-icon {
      display: block;
    }
  }

  @media only screen and (max-width: 768px) {
    display: none;
  }
`;

const FaucetMenu = styled.div`
  width: 100%;
  margin-top: auto;
  margin-bottom: 20px;
  a {
    padding: 7px 0px;
    svg {
      fill: var(--color-text-main);
      margin-left: 34px;
      margin-right: 26px;
    }
    &:not(:last-child) {
      margin-bottom: 48px;
    }

    &:hover {
      svg {
        fill: var(--color-yellow);
      }
      span {
        color: var(--color-yellow);
      }
    }

    @media only screen and (max-width: 1440px) {
      span {
        font-size: 14px;
      }
    }

    @media only screen and (max-width: 1280px) {
      span {
        font-size: 12px;
      }
    }
  }
  .active {
    background-color: var(--color-bg-active);
    svg {
      fill: var(--color-yellow);
    }
    span {
      color: var(--color-yellow);
    }
  }

  @media only screen and (max-width: 768px) {
    display: none;
  }
`;

const TotalValue = styled.div`
  width: 100%;
  margin-bottom: 20px;

  > div {
    span:first-child {
      word-break: break-all;
      text-align: center;
    }
  }

  @media only screen and (max-width: 768px) {
    display: none;
  }
`;

const MobileMenu = styled.div`
  display: none;

  @media only screen and (max-width: 768px) {
    display: block;
    position: relative;
    .ant-select {
      .ant-select-selection {
        background-color: transparent;
        border: none;
        color: var(--color-text-main);
        font-size: 17px;
        font-weight: 900;
        color: var(--color-text-main);
        margin-top: 4px;
        i {
          color: var(--color-text-main);
        }
      }
    }
  }
`;

const ConnectButton = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;

  @media only screen and (max-width: 768px) {
    margin: 0;
  }

  .connect-btn {
    width: 114px;
    height: 30px;
    border-radius: 5px;
    background-image: linear-gradient(to right, #f2c265, #f7b44f);

    @media only screen and (max-width: 768px) {
      width: 60px;
    }

    .MuiButton-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-main);
      text-transform: capitalize;

      @media only screen and (max-width: 768px) {
        font-size: 12px;
      }
    }
  }
`;

const { Option } = Select;

let metamask = null;
let accounts = [];
let metamaskWatcher = null;
const abortController = new AbortController();

const format = commaNumber.bindWith(',', '.');

function Sidebar({ history, settings, setSetting, getGovernanceVenus }) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [error, setError] = useState('');
  const [web3, setWeb3] = useState(null);
  const [awaiting, setAwaiting] = useState(false);
  const [totalVaiMinted, setTotalVaiMinted] = useState('0');
  const [wcUri, setWcUri] = useState(null);

  const defaultPath = history.location.pathname.split('/')[1];
  const checkNetwork = () => {
    let netId;
    if (settings.walletType === 'binance') {
      netId = +window.BinanceChain.chainId;
    } else {
      netId = window.ethereum.networkVersion
        ? +window.ethereum.networkVersion
        : +window.ethereum.chainId;
    }
    setSetting({
      accountLoading: true
    });
    if (netId) {
      if (netId === 97 || netId === 56) {
        if (netId === 97 && process.env.REACT_APP_ENV === 'prod') {
          toast.error({
            title: `You are currently visiting the Binance Testnet Smart Chain Network. Please change your metamask to access the Binance Smart Chain Main Network`
          });
          return false;
        }
        if (netId === 56 && process.env.REACT_APP_ENV === 'dev') {
          toast.error({
            title: `You are currently visiting the Binance Smart Chain Main Network. Please change your metamask to access the Binance Testnet Smart Chain Network`
          });
        } else {
          setSetting({
            accountLoading: false
          });
        }
      } else {
        toast.error({
          title: `Venus is only supported on Binance Smart Chain Network. Please confirm you installed Metamask and selected Binance Smart Chain Network`
        });
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.addEventListener('load', event => {
        checkNetwork();
      });
    }
  }, [window.ethereum]);

  // ---------------------------------MetaMask connect-------------------------------------
  const withTimeoutRejection = async (promise, timeout) => {
    const sleep = new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error(constants.TIMEOUT)), timeout)
    );
    return Promise.race([promise, sleep]);
  };

  const handleWatch = useCallback(async () => {
    if (window.ethereum) {
      const accs = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accs[0]) {
        accounts = [];
        clearTimeout(metamaskWatcher);
        setSetting({ selectedAddress: null });
      }
    }
    if (metamaskWatcher) {
      clearTimeout(metamaskWatcher);
    }

    if (!web3 || !accounts.length) {
      setAwaiting(true);
    }

    let tempWeb3 = null;
    let tempAccounts = [];
    let tempError = error;
    let latestBlockNumber = 0;
    try {
      const isLocked = error && error.message === constants.LOCKED;
      if (!metamask || isLocked) {
        metamask = await withTimeoutRejection(
          MetaMaskClass.initialize(undefined), // if option is existed, add it
          20 * 1000 // timeout
        );
      }

      tempWeb3 = await metamask.getWeb3();
      tempAccounts = await metamask.getAccounts();
      latestBlockNumber = await metamask.getLatestBlockNumber();
      if (latestBlockNumber) {
        await setSetting({ latestBlockNumber });
      }
      tempError = null;
    } catch (err) {
      tempError = err;
      accounts = [];
      await setSetting({ selectedAddress: null });
    }
    await setSetting({ selectedAddress: tempAccounts[0] });
    accounts = tempAccounts;
    setWeb3(tempWeb3);
    setError(tempError);
    setAwaiting(false);
    if (!tempError) {
      metamaskWatcher = setTimeout(() => {
        clearTimeout(metamaskWatcher);
        handleWatch();
      }, 3000);
    }
  }, [error, web3]);

  const handleMetaMask = () => {
    setSetting({ walletType: 'metamask' });
    setError(MetaMaskClass.hasWeb3() ? '' : new Error(constants.NOT_INSTALLED));
    handleWatch();
  };
  // -------------------------------------------------------------------------------------

  const setDecimals = async () => {
    const decimals = {};
    Object.values(constants.CONTRACT_TOKEN_ADDRESS).forEach(async item => {
      decimals[`${item.id}`] = {};
      if (item.id !== 'bnb') {
        const tokenContract = getTokenContract(item.id);
        const tokenDecimals = await methods.call(
          tokenContract.methods.decimals,
          []
        );
        const vBepContract = getVbepContract(item.id);
        const vtokenDecimals = await methods.call(
          vBepContract.methods.decimals,
          []
        );
        decimals[`${item.id}`].token = Number(tokenDecimals);
        decimals[`${item.id}`].vtoken = Number(vtokenDecimals);
        decimals[`${item.id}`].price = 18 + 18 - Number(tokenDecimals);
      } else {
        decimals[`${item.id}`].token = 18;
        decimals[`${item.id}`].vtoken = 8;
        decimals[`${item.id}`].price = 18;
      }
    });
    decimals.mantissa = +process.env.REACT_APP_MANTISSA_DECIMALS;
    decimals.comptroller = +process.env.REACT_APP_COMPTROLLER_DECIMALS;
    await setSetting({ decimals });
  };

  const initSettings = async () => {
    await setDecimals();
    setSetting({
      pendingInfo: {
        type: '',
        status: false,
        amount: 0,
        symbol: ''
      }
    });
  };

  useEffect(() => {
    if (accounts.length !== 0) {
      setIsOpenModal(false);
    }
    return function cleanup() {
      abortController.abort();
    };
  }, [handleWatch, settings.accounts]);

  useEffect(() => {
    handleWatch();
  }, [window, history]);

  const getTotalVaiMinted = async () => {
    // total vai minted
    const vaiContract = getVaiTokenContract();
    let tvm = await methods.call(vaiContract.methods.totalSupply, []);
    tvm = new BigNumber(tvm).div(
      new BigNumber(10).pow(Number(process.env.REACT_APP_VAI_DECIMALS) || 18)
    );

    setTotalVaiMinted(tvm);
  };

  const getMarkets = async () => {
    const res = await promisify(getGovernanceVenus, {});
    if (!res.status) {
      return;
    }

    setSetting({
      markets: res.data.markets,
      dailyVenus: res.data.dailyVenus
    });
  };

  useEffect(() => {
    let updateTimer;
    if (settings.selectedAddress) {
      updateTimer = setInterval(() => {
        if (checkIsValidNetwork(settings.walletType)) {
          getMarkets();
        }
      }, 3000);
    }
    return function cleanup() {
      abortController.abort();
      if (updateTimer) {
        clearInterval(updateTimer);
      }
    };
  }, [settings.selectedAddress, settings.assetList, settings.accountLoading]);

  const onChangePage = value => {
    history.push(`/${value}`);
  };

  useEffect(() => {
    if (checkIsValidNetwork(settings.walletType)) {
      getTotalVaiMinted();
    }
  }, [settings.markets]);

  useEffect(() => {
    if (window.ethereum) {
      if (
        !settings.accountLoading &&
        checkIsValidNetwork(settings.walletType)
      ) {
        initSettings();
      }
    }
    return function cleanup() {
      abortController.abort();
    };
  }, [settings.accountLoading]);

  useEffect(() => {
    if (!settings.selectedAddress) {
      return;
    }
    if (
      window.ethereum &&
      settings.walletType !== 'binance' &&
      checkIsValidNetwork(settings.walletType)
    ) {
      window.ethereum.on('accountsChanged', accs => {
        setSetting({
          selectedAddress: accs[0],
          accountLoading: true
        });
      });
    }
  }, [window.ethereum, settings.selectedAddress]);

  const updateMarketInfo = async () => {
    const accountAddress = settings.selectedAddress;
    if (!accountAddress || !settings.decimals || !settings.markets) {
      return;
    }
    const appContract = getComptrollerContract();
    const vaiContract = getVaiTokenContract();

    // Total Vai Staked
    let vaiVaultStaked = await methods.call(vaiContract.methods.balanceOf, [
      constants.CONTRACT_VAI_VAULT_ADDRESS
    ]);
    vaiVaultStaked = new BigNumber(vaiVaultStaked)
      .div(1e18)
      .dp(4, 1)
      .toString(10);

    // minted vai amount
    let vaiMinted = await methods.call(appContract.methods.mintedVAIs, [
      accountAddress
    ]);
    vaiMinted = new BigNumber(vaiMinted).div(new BigNumber(10).pow(18));

    // VAI APY
    let vaiAPY;
    if (settings.dailyVenus && vaiVaultStaked) {
      let venusVAIVaultRate = await methods.call(
        appContract.methods.venusVAIVaultRate,
        []
      );
      venusVAIVaultRate = new BigNumber(venusVAIVaultRate)
        .div(1e18)
        .times(20 * 60 * 24);
      const xvsMarket = settings.markets.find(
        ele => ele.underlyingSymbol === 'XVS'
      );
      vaiAPY = new BigNumber(venusVAIVaultRate)
        .times(xvsMarket.tokenPrice)
        .times(365 * 100)
        .div(vaiVaultStaked)
        .dp(2, 1)
        .toString(10);
      setSetting({
        vaiAPY
      });
    }

    const assetsIn = await methods.call(appContract.methods.getAssetsIn, [
      accountAddress
    ]);

    let totalSupplyBalance = new BigNumber(0);
    let totalBorrowBalance = new BigNumber(0);
    let totalBorrowLimit = new BigNumber(0);
    let totalLiquidity = new BigNumber(0);
    const assetList = [];

    for (
      let index = 0;
      index < Object.values(constants.CONTRACT_TOKEN_ADDRESS).length;
      index++
    ) {
      const item = Object.values(constants.CONTRACT_TOKEN_ADDRESS)[index];
      if (!settings.decimals[item.id]) {
        return;
      }

      let market = settings.markets.find(
        ele => ele.underlyingSymbol === item.symbol
      );
      if (!market) market = {};
      const asset = {
        key: index,
        id: item.id,
        img: item.asset,
        vimg: item.vasset,
        name: market.underlyingSymbol || '',
        symbol: market.underlyingSymbol || '',
        tokenAddress: item.address,
        vsymbol: market.symbol,
        vtokenAddress: constants.CONTRACT_VBEP_ADDRESS[item.id].address,
        supplyApy: new BigNumber(market.supplyApy || 0),
        borrowApy: new BigNumber(market.borrowApy || 0),
        xvsSupplyApy: new BigNumber(market.supplyVenusApy || 0),
        xvsBorrowApy: new BigNumber(market.borrowVenusApy || 0),
        collateralFactor: new BigNumber(market.collateralFactor || 0).div(1e18),
        tokenPrice: new BigNumber(market.tokenPrice || 0),
        liquidity: new BigNumber(market.liquidity || 0),
        borrowCaps: new BigNumber(market.borrowCaps || 0),
        totalBorrows: new BigNumber(market.totalBorrows2 || 0),
        walletBalance: new BigNumber(0),
        supplyBalance: new BigNumber(0),
        borrowBalance: new BigNumber(0),
        isEnabled: false,
        collateral: false,
        percentOfLimit: '0'
      };

      const tokenDecimal = settings.decimals[item.id].token;
      const vBepContract = getVbepContract(item.id);
      asset.collateral = assetsIn.includes(asset.vtokenAddress);
      // wallet balance
      if (item.id !== 'bnb') {
        const tokenContract = getTokenContract(item.id);
        const walletBalance = await methods.call(
          tokenContract.methods.balanceOf,
          [accountAddress]
        );
        asset.walletBalance = new BigNumber(walletBalance).div(
          new BigNumber(10).pow(tokenDecimal)
        );

        // allowance
        let allowBalance = await methods.call(tokenContract.methods.allowance, [
          accountAddress,
          asset.vtokenAddress
        ]);
        allowBalance = new BigNumber(allowBalance).div(
          new BigNumber(10).pow(tokenDecimal)
        );
        asset.isEnabled = allowBalance.isGreaterThan(asset.walletBalance);
      } else if (window.ethereum) {
        await window.web3.eth.getBalance(accountAddress, (err, res) => {
          if (!err) {
            asset.walletBalance = new BigNumber(res).div(
              new BigNumber(10).pow(tokenDecimal)
            );
          }
        });
        asset.isEnabled = true;
      }
      // supply balance
      const supplyBalance = await methods.call(
        vBepContract.methods.balanceOfUnderlying,
        [accountAddress]
      );
      asset.supplyBalance = new BigNumber(supplyBalance).div(
        new BigNumber(10).pow(tokenDecimal)
      );

      // borrow balance
      const borrowBalance = await methods.call(
        vBepContract.methods.borrowBalanceCurrent,
        [accountAddress]
      );
      asset.borrowBalance = new BigNumber(borrowBalance).div(
        new BigNumber(10).pow(tokenDecimal)
      );

      // percent of limit
      asset.percentOfLimit = new BigNumber(settings.totalBorrowLimit).isZero()
        ? '0'
        : asset.borrowBalance
            .times(asset.tokenPrice)
            .div(settings.totalBorrowLimit)
            .times(100)
            .dp(0, 1)
            .toString(10);

      // hypotheticalLiquidity
      const totalBalance = await methods.call(vBepContract.methods.balanceOf, [
        accountAddress
      ]);
      asset.hypotheticalLiquidity = await methods.call(
        appContract.methods.getHypotheticalAccountLiquidity,
        [accountAddress, asset.vtokenAddress, totalBalance, 0]
      );

      assetList.push(asset);

      const supplyBalanceUSD = asset.supplyBalance.times(asset.tokenPrice);
      const borrowBalanceUSD = asset.borrowBalance.times(asset.tokenPrice);

      totalSupplyBalance = totalSupplyBalance.plus(supplyBalanceUSD);
      totalBorrowBalance = totalBorrowBalance.plus(borrowBalanceUSD);

      if (asset.collateral) {
        totalBorrowLimit = totalBorrowLimit.plus(
          supplyBalanceUSD.times(asset.collateralFactor)
        );
      }

      totalLiquidity = totalLiquidity.plus(
        new BigNumber(market.totalSupplyUsd || 0)
      );
    }
    let vaiBalance = await methods.call(vaiContract.methods.balanceOf, [
      constants.CONTRACT_VAI_VAULT_ADDRESS
    ]);
    vaiBalance = new BigNumber(vaiBalance).div(1e18);

    setSetting({
      assetList,
      vaiMinted,
      totalLiquidity: totalLiquidity.plus(vaiBalance).toString(10),
      totalSupplyBalance: totalSupplyBalance.toString(10),
      totalBorrowBalance: totalBorrowBalance.plus(vaiMinted).toString(10),
      totalBorrowLimit: totalBorrowLimit.toString(10)
    });
  };

  const handleAccountChange = async () => {
    setSetting({
      accountLoading: true
    });
    await updateMarketInfo();
    setSetting({
      accountLoading: false
    });
  };

  useEffect(() => {
    updateMarketInfo();
  }, [settings.markets, settings.selectedAddress]);

  useEffect(() => {
    if (!settings.selectedAddress) return;
    handleAccountChange();
  }, [settings.selectedAddress]);
  return (
    <SidebarWrapper>
      <Logo>
        <NavLink to="/" activeClassName="active">
          <img src={logoImg} alt="logo" className="logo-text" />
        </NavLink>
      </Logo>
      <MainMenu>
        <NavLink
          className="flex flex-start align-center"
          to="/dashboard"
          activeClassName="active"
        >
          <Icon type="home" theme="filled" />
          <Label primary>Dashboard</Label>
        </NavLink>
        <NavLink
          className="flex flex-start align-center"
          to="/vote"
          activeClassName="active"
        >
          <Icon type="appstore" />
          <Label primary>Vote</Label>
        </NavLink>
        <NavLink
          className="flex flex-start align-center"
          to="/xvs"
          activeClassName="active"
        >
          <img className="xvs-icon" src={XVSIcon} alt="xvs" />
          <img className="xvs-active-icon" src={XVSActiveIcon} alt="xvs" />
          <Label primary>XVS</Label>
        </NavLink>
        <NavLink
          className="flex flex-start align-center"
          to="/market"
          activeClassName="active"
        >
          <Icon type="area-chart" />
          <Label primary>Market</Label>
        </NavLink>
        <NavLink
          className="flex flex-start align-center"
          to="/vault"
          activeClassName="active"
        >
          <Icon type="golden" theme="filled" />
          <Label primary>Vault</Label>
        </NavLink>
      </MainMenu>
      <FaucetMenu>
        {process.env.REACT_APP_ENV === 'dev' && (
          <NavLink
            className="flex just-center"
            to="/faucet"
            activeClassName="active"
          >
            <Label primary>Faucet</Label>
          </NavLink>
        )}
      </FaucetMenu>
      {settings.selectedAddress && (
        <TotalValue>
          <div className="flex flex-column align-center just-center">
            <Label primary>
              $
              {format(
                new BigNumber(settings.totalLiquidity).dp(2, 1).toString(10)
              )}
            </Label>
            <Label className="center">Total Value Locked</Label>
          </div>
        </TotalValue>
      )}
      {settings.selectedAddress && (
        <TotalValue>
          <div className="flex flex-column align-center just-center">
            <Label primary>
              {format(
                getBigNumber(totalVaiMinted)
                  .dp(0, 1)
                  .toString(10)
              )}
            </Label>
            <Label className="center">Total VAI Minted</Label>
          </div>
        </TotalValue>
      )}
      <ConnectButton>
        {!settings.selectedAddress && (
          <Button
            className="connect-btn"
            onClick={() => {
              setIsOpenModal(true);
            }}
          >
            Connect
          </Button>
        )}
      </ConnectButton>
      <MobileMenu id="main-menu">
        <Select
          defaultValue={defaultPath}
          style={{ width: 120, marginRight: 10 }}
          getPopupContainer={() => document.getElementById('main-menu')}
          dropdownMenuStyle={{
            backgroundColor: '#090d27'
          }}
          dropdownClassName="asset-select"
          onChange={onChangePage}
        >
          <Option className="flex align-center just-center" value="dashboard">
            <Label size={14} primary>
              Dashboard
            </Label>
          </Option>
          <Option className="flex align-center just-center" value="vote">
            <Label size={14} primary>
              Vote
            </Label>
          </Option>
          <Option className="flex align-center just-center" value="xvs">
            <Label size={14} primary>
              XVS
            </Label>
          </Option>
          <Option className="flex align-center just-center" value="market">
            <Label size={14} primary>
              Market
            </Label>
          </Option>
          <Option className="flex align-center just-center" value="vault">
            <Label size={14} primary>
              Vault
            </Label>
          </Option>
          {process.env.REACT_APP_ENV === 'dev' && (
            <Option className="flex align-center just-center" value="faucet">
              <Label size={14} primary>
                Faucet
              </Label>
            </Option>
          )}
        </Select>
      </MobileMenu>
      <ConnectModal
        visible={isOpenModal}
        web3={web3}
        error={error}
        wcUri={wcUri}
        awaiting={awaiting}
        onCancel={() => setIsOpenModal(false)}
        onConnectMetaMask={handleMetaMask}
        onBack={() => setWcUri(null)}
      />
    </SidebarWrapper>
  );
}

Sidebar.propTypes = {
  history: PropTypes.object,
  settings: PropTypes.object,
  setSetting: PropTypes.func.isRequired,
  getGovernanceVenus: PropTypes.func.isRequired
};

Sidebar.defaultProps = {
  settings: {},
  history: {}
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { setSetting, getGovernanceVenus } = accountActionCreators;

  return bindActionCreators(
    {
      setSetting,
      getGovernanceVenus
    },
    dispatch
  );
};

export default compose(
  withRouter,
  connectAccount(mapStateToProps, mapDispatchToProps)
)(Sidebar);
