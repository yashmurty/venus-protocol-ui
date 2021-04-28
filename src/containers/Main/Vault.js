/* eslint-disable no-useless-escape */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import BigNumber from 'bignumber.js';
import * as constants from 'utilities/constants';
import MainLayout from 'containers/Layout/MainLayout';
import TotalInfo from 'components/Vault/TotalInfo';
import UserInfo from 'components/Vault/UserInfo';
import Staking from 'components/Vault/Staking';
import { connectAccount, accountActionCreators } from 'core';
import {
  getVaiTokenContract,
  getComptrollerContract,
  getVaiVaultContract,
  getTokenContract,
  methods
} from 'utilities/ContractService';
import { checkIsValidNetwork } from 'utilities/common';
import LoadingSpinner from 'components/Basic/LoadingSpinner';
import { Row, Column } from 'components/Basic/Style';

const MarketWrapper = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const VaultWrapper = styled.div`
  padding-top: 30px;
  height: 100%;
  position: relative;
  width: 100%;
  max-width: 1200px;
`;

const SpinnerWrapper = styled.div`
  height: 80vh;
  width: 100%;

  @media only screen and (max-width: 1440px) {
    height: 70vh;
  }
`;

function Vault({ settings }) {
  const [emission, setEmission] = useState('0');
  const [totalVaiStaked, setTotalVaiStaked] = useState('0');
  const [pendingRewards, setPendingRewards] = useState('0');
  const [availableVai, setAvailableVai] = useState(new BigNumber(0));
  const [vaiStaked, setVaiStaked] = useState(new BigNumber(0));
  const [vaiReward, setVaiReward] = useState('0');
  const [isEnabled, setIsEnabled] = useState('0');

  const updateTotalInfo = async () => {
    const compContract = getComptrollerContract();

    // total info
    let venusVAIVaultRate = await methods.call(compContract.methods.venusVAIVaultRate, []);
    venusVAIVaultRate = new BigNumber(venusVAIVaultRate).div(1e18).times(20 * 60 * 24);
    setEmission(venusVAIVaultRate.dp(2, 1).toString(10));

    const vaiContract = getVaiTokenContract();
    let vaiBalance = await methods.call(vaiContract.methods.balanceOf, [constants.CONTRACT_VAI_VAULT_ADDRESS]);
    vaiBalance = new BigNumber(vaiBalance).div(1e18).dp(4, 1).toString(10);
    setTotalVaiStaked(vaiBalance);

    const vaultContract = getVaiVaultContract();
    // let amount = await methods.call(vaultContract.methods.pendingRewards, []);
    // amount = new BigNumber(amount).div(1e18).dp(4, 1).toString(10);
    const xvsTokenContract = getTokenContract('xvs');
    let amount = await methods.call(xvsTokenContract.methods.balanceOf, [constants.CONTRACT_VAI_VAULT_ADDRESS]);
    amount = new BigNumber(amount).div(1e18).dp(4, 1).toString(10);
    setPendingRewards(amount);

    // user info
    const tokenContract = getVaiTokenContract();
    let availableAmount = await methods.call(tokenContract.methods.balanceOf, [settings.selectedAddress]);
    availableAmount = new BigNumber(availableAmount).div(1e18);
    setAvailableVai(availableAmount);

    const { 0: staked } = await methods.call(vaultContract.methods.userInfo, [settings.selectedAddress]);
    amount = new BigNumber(staked).div(1e18);
    setVaiStaked(amount);

    amount = await methods.call(vaultContract.methods.pendingXVS, [settings.selectedAddress]);
    amount = new BigNumber(amount).div(1e18).dp(4, 1).toString(10);
    setVaiReward(amount);

    // isEnabled
    let allowBalance = await methods.call(tokenContract.methods.allowance, [
      settings.selectedAddress,
      constants.CONTRACT_VAI_VAULT_ADDRESS
    ]);
    allowBalance = new BigNumber(allowBalance).div(1e18);
    setIsEnabled(allowBalance.gt(availableAmount));
  };

  useEffect(() => {
    if (checkIsValidNetwork()) {
      updateTotalInfo();
    }
  }, [settings.markets]);

  return (
    <MainLayout title="Vault">
      <MarketWrapper>
        <VaultWrapper className="flex">
          {!settings.selectedAddress ? (
            <SpinnerWrapper>
              <LoadingSpinner />
            </SpinnerWrapper>
          ) : (
            <Row>
              <Column xs="12">
                <TotalInfo
                  emission={emission}
                  totalVaiStaked={totalVaiStaked}
                  pendingRewards={pendingRewards}
                />
              </Column>
              <Column xs="12">
                <Row>
                  <Column xs="12" sm="12" md="5">
                    <UserInfo
                      availableVai={availableVai}
                      vaiStaked={vaiStaked}
                      vaiReward={vaiReward}
                    />
                  </Column>
                  <Column xs="12" sm="12" md="7">
                    <Staking
                      isEnabled={isEnabled}
                      availableVai={availableVai}
                      vaiStaked={vaiStaked}
                      updateTotalInfo={updateTotalInfo}
                    />
                  </Column>
                </Row>
              </Column>
            </Row>
          )}
        </VaultWrapper>
      </MarketWrapper>
    </MainLayout>
  );
}

Vault.propTypes = {
  settings: PropTypes.object
};

Vault.defaultProps = {
  settings: {}
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { setSetting } = accountActionCreators;

  return bindActionCreators(
    {
      setSetting
    },
    dispatch
  );
};

export default compose(
  withRouter,
  connectAccount(mapStateToProps, mapDispatchToProps)
)(Vault);
