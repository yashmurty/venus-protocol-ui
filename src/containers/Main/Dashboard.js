/* eslint-disable no-useless-escape */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import MainLayout from 'containers/Layout/MainLayout';
import CoinInfo from 'components/Dashboard/CoinInfo';
import VaiInfo from 'components/Dashboard/VaiInfo';
import BorrowLimit from 'components/Dashboard/BorrowLimit';
import Overview from 'components/Dashboard/Overview';
import WalletBalance from 'components/Dashboard/WalletBalance';
import Market from 'components/Dashboard/Market';
import { connectAccount, accountActionCreators } from 'core';
import LoadingSpinner from 'components/Basic/LoadingSpinner';
import { Row, Column } from 'components/Basic/Style';
import {
  getComptrollerContract,
  getVaiControllerContract,
  getVaiTokenContract,
  methods
} from 'utilities/ContractService';
import BigNumber from 'bignumber.js';
import * as constants from 'utilities/constants';

const DashboardWrapper = styled.div`
  height: 100%;
`;

const SpinnerWrapper = styled.div`
  height: 85vh;
  width: 100%;

  @media only screen and (max-width: 1440px) {
    height: 70vh;
  }
`;

let lockFlag = false;

function Dashboard({ settings, setSetting }) {
  const updateMarketInfo = async () => {
    const accountAddress = settings.selectedAddress;
    lockFlag = true;
    if (!accountAddress || !settings.decimals || !settings.markets) {
      return;
    }
    const appContract = getComptrollerContract();
    const vaiControllerContract = getVaiControllerContract();
    const vaiContract = getVaiTokenContract();
    // vai amount in wallet
    let vaiBalance = await methods.call(vaiContract.methods.balanceOf, [
      accountAddress
    ]);
    vaiBalance = new BigNumber(vaiBalance).div(new BigNumber(10).pow(18));

    // minted vai amount
    let vaiMinted = await methods.call(appContract.methods.mintedVAIs, [
      accountAddress
    ]);
    vaiMinted = new BigNumber(vaiMinted).div(new BigNumber(10).pow(18));

    // mintable vai amount
    let { 1: mintableVai } = await methods.call(
      vaiControllerContract.methods.getMintableVAI,
      [accountAddress]
    );
    mintableVai = new BigNumber(mintableVai).div(new BigNumber(10).pow(18));

    // allowable amount
    let allowBalance = await methods.call(vaiContract.methods.allowance, [
      accountAddress,
      constants.CONTRACT_VAI_UNITROLLER_ADDRESS
    ]);
    allowBalance = new BigNumber(allowBalance).div(new BigNumber(10).pow(18));
    const vaiEnabled = allowBalance.isGreaterThanOrEqualTo(vaiMinted);

    setSetting({
      vaiBalance,
      vaiEnabled,
      vaiMinted,
      mintableVai
    });
    lockFlag = false;
  };

  const handleAccountChange = async () => {
    await updateMarketInfo();
    setSetting({
      accountLoading: false
    });
  };

  useEffect(() => {
    updateMarketInfo();
  }, [settings.markets, settings.selectedAddress]);

  useEffect(() => {
    if (settings.accountLoading) {
      handleAccountChange();
    }
  }, [settings.accountLoading]);

  return (
    <MainLayout title="Dashboard">
      <DashboardWrapper className="flex">
        {(!settings.selectedAddress || settings.accountLoading) && (
          <SpinnerWrapper>
            <LoadingSpinner />
          </SpinnerWrapper>
        )}
        {settings.selectedAddress && !settings.accountLoading && (
          <Row>
            <Column xs="12" sm="12" md="5">
              <Row>
                <Column xs="12">
                  <CoinInfo />
                </Column>
                <Column xs="12">
                  <VaiInfo />
                </Column>
                <Column xs="12">
                  <BorrowLimit />
                </Column>
                <Column xs="12">
                  <Overview />
                </Column>
              </Row>
            </Column>
            <Column xs="12" sm="12" md="7">
              <Row>
                <Column xs="12">
                  <WalletBalance />
                </Column>
                <Column xs="12">
                  <Market />
                </Column>
              </Row>
            </Column>
          </Row>
        )}
      </DashboardWrapper>
    </MainLayout>
  );
}

Dashboard.propTypes = {
  history: PropTypes.object,
  settings: PropTypes.object,
  setSetting: PropTypes.func.isRequired,
  getGovernanceVenus: PropTypes.func.isRequired
};

Dashboard.defaultProps = {
  history: {},
  settings: {}
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
)(Dashboard);
