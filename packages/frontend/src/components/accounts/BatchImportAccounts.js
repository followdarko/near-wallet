import BN from 'bn.js';
import { KeyPair, transactions } from 'near-api-js';
import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Translate } from 'react-localize-redux';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import ShieldIcon from '../../images/icon-shield.svg';
import ImportArrow from '../../images/import-arrow.svg';
import refreshAccountOwner from '../../redux/sharedThunks/refreshAccountOwner';
import { selectAccountUrlReferrer } from '../../redux/slices/account';
import { selectAvailableAccounts, selectAvailableAccountsIsLoading } from '../../redux/slices/availableAccounts';
import { wallet } from '../../utils/wallet';
import { getEstimatedFees } from '../common/balance/helpers';
import FormButton from '../common/FormButton';
import FormButtonGroup from '../common/FormButtonGroup';
import Modal from '../common/modal/Modal';
import Container from '../common/styled/Container.css';
import ConnectWithApplication from '../login/v2/ConnectWithApplication';
import SignTransaction from '../sign/v2/SignTransaction';
import SignTransactionDetails from '../sign/v2/SignTransactionDetails';
import AccountListImport from './AccountListImport';
import BatchImportAccountsSuccessScreen from './BatchImportAccountsSuccessScreen';

const CustomContainer = styled.div`
    width: 100%;
    margin-top: 40px;

    .buttons-bottom-buttons {
        margin-top: 40px;
    }

    .title {
        text-align: left;
        font-size: 12px;
    }
`;

const ModalContainer = styled(Container)`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;

    h3 {
      text-align: center;
    }

    .top-icon {
      height: 60px;
      width: 60px;
      margin-bottom: 40px;
    }

    .desc {
      padding: 0 45px;
      text-align: center;
      margin-top: 24px;
      p {
        margin: 0;
      }
    }

    button {
      align-self: stretch;
    }

    .link {
      margin-top: 16px !important;
      font-weight: normal !important;
    }

    .button-group {
      align-self: stretch;
    }

    .connect-with-application {
      margin: 20px auto 30px auto;
    }

    .transfer-amount {
      width: 100%;
    }

    .error-label {
      margin-top: 16px;
      color: #FC5B5B;
    }
`;

const ACTIONS = {
  BEGIN_IMPORT: 'BEGIN_IMPORT',
  SET_CURRENT_DONE: 'SET_CURRENT_DONE',
  SET_CURRENT_FAILED: 'SET_CURRENT_FAILED',
  CONFIRM_URL: 'CONFIRM_URL',
  REMOVE_ACCOUNTS: 'REMOVE_ACCOUNTS'
};

const IMPORT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  UP_NEXT: 'waiting',
  FAILED: 'error'
};

const reducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.REMOVE_ACCOUNTS:
            return state.accounts.every(({ status }) => status === null)
                    ? {
                        ...state,
                        accounts: state.accounts.filter(
                            (account) =>
                                !action.accounts.some(
                                    (accountId) => account.accountId === accountId
                                )
                        ),
                      } 
                    : state;
        case ACTIONS.BEGIN_IMPORT:
            return state.accounts.every(({ status }) => status === null)
                ? {
                      accounts: state.accounts.map((acc, idx) => ({
                          ...acc,
                          status:
                              idx === 0
                                  ? IMPORT_STATUS.PENDING
                                  : IMPORT_STATUS.UP_NEXT,
                      })),
                      urlConfirmed: false,
                  }
                : state;
        case ACTIONS.SET_CURRENT_DONE: {
            let currentIndex = state.accounts.findIndex(
                (account) => account.status === IMPORT_STATUS.PENDING
            );
            return {
                accounts: state.accounts.map((acc, idx) => ({
                    ...acc,
                    status:
                        idx === currentIndex
                            ? IMPORT_STATUS.SUCCESS
                            : idx === currentIndex + 1
                            ? IMPORT_STATUS.PENDING
                            : state.accounts[idx].status,
                })),
                urlConfirmed: true,
            };
        }
        case ACTIONS.SET_CURRENT_FAILED: {
            let currentIndex = state.accounts.findIndex(
                (account) => account.status === IMPORT_STATUS.PENDING
            );
            return {
                accounts: state.accounts.map((acc, idx) => ({
                    ...acc,
                    status:
                        idx === currentIndex
                            ? IMPORT_STATUS.FAILED
                            : idx === currentIndex + 1
                            ? IMPORT_STATUS.PENDING
                            : state.accounts[idx].status,
                })),
                urlConfirmed: true,
            };
        }
        case ACTIONS.CONFIRM_URL:
            return {
                ...state,
                urlConfirmed: true,
            };
        default:
            return state;
    }
};

const BatchImportAccounts = ({ accountIdToKeyMap, onCancel }) => {
    const availableAccountsIsLoading = useSelector(selectAvailableAccountsIsLoading);
    const availableAccounts = useSelector(selectAvailableAccounts);

    const [state, dispatch] = useReducer(reducer, {
        accounts: Object.keys(accountIdToKeyMap).map((accountId) => ({
            accountId,
            status: null,
            key: accountIdToKeyMap[accountId],
        })),
    });
    const currentAccount = useMemo(() => state.accounts.find((account) => account.status === IMPORT_STATUS.PENDING), [state.accounts]);
    const accountsApproved = useMemo(() => state.accounts.reduce((acc, curr) => curr.status === IMPORT_STATUS.SUCCESS ? acc + 1 : acc,0), [state.accounts]);
    const completed = useMemo(() => state.accounts.every((account) => account.status === IMPORT_STATUS.SUCCESS || account.status === IMPORT_STATUS.FAILED), [state.accounts]);
    const showSuccessScreen = useMemo(() => completed && state.accounts.some((account) => account.status === IMPORT_STATUS.SUCCESS), [completed, state.accounts]);

    useEffect(() => {
      if (!currentAccount) {
        dispatch({type: ACTIONS.REMOVE_ACCOUNTS, accounts: availableAccounts});
      }
    },[availableAccounts]);

    return showSuccessScreen ? (
        <BatchImportAccountsSuccessScreen
            accounts={state.accounts.filter(
                ({ status }) => status === IMPORT_STATUS.SUCCESS
            )}
        />
    ) : (
        <>
            <Container className="small-centered border ledger-theme">
                <img src={ImportArrow} alt="ImportArrow" />
                <CustomContainer>
                    <div className="title">
                        {accountsApproved}/{state.accounts.length}{' '}
                        <Translate id="signInLedger.modal.accountsApproved" />
                    </div>
                    <AccountListImport accounts={state.accounts} />
                    <div style={{ borderTop: '2px solid #f5f5f5' }} />
                    <FormButtonGroup>
                        <FormButton
                            onClick={onCancel}
                            className="gray-blue"
                            disabled={availableAccountsIsLoading}
                        >
                            <Translate id="button.cancel" />
                        </FormButton>
                        <FormButton
                            onClick={() =>
                                dispatch({ type: ACTIONS.BEGIN_IMPORT })
                            }
                            disabled={availableAccountsIsLoading || completed}
                        >
                            <Translate id="button.beginImport" />
                        </FormButton>
                    </FormButtonGroup>
                </CustomContainer>
            </Container>
            {currentAccount ? (
                state.urlConfirmed ? (
                    <AccountImportModal
                        account={currentAccount}
                        onSuccess={() =>
                            dispatch({ type: ACTIONS.SET_CURRENT_DONE })
                        }
                        onFail={() =>
                            dispatch({ type: ACTIONS.SET_CURRENT_FAILED })
                        }
                    />
                ) : (
                    <Modal
                        isOpen={currentAccount}
                        modalSize="sm"
                        modalClass="slim"
                        onClose={() => {}}
                        disableClose
                    >
                        <ModalContainer>
                            <img
                                src={ShieldIcon}
                                alt="SHIELD"
                                className="top-icon"
                            />
                            <h3>
                                <Translate id="batchImportAccounts.confirmUrlModal.title" />
                            </h3>
                            <div className="desc">
                                <p>
                                    <Translate id="batchImportAccounts.confirmUrlModal.desc" />
                                </p>
                            </div>
                            <FormButton
                                onClick={() =>
                                    dispatch({ type: ACTIONS.CONFIRM_URL })
                                }
                                style={{ marginTop: 48 }}
                            >
                                <Translate id="button.looksGood" />
                            </FormButton>
                        </ModalContainer>
                    </Modal>
                )
            ) : null}
        </>
    );
};

const AccountImportModal = ({ account, onSuccess, onFail }) => {
  const [keyType, setKeyType] = useState(null);
  const [accountBalance, setAccountBalance] = useState(null);
  const [showTxDetails, setShowTxDetails] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [error, setError] = useState(false);
  const accountUrlReferrer = useSelector(selectAccountUrlReferrer);
  const addFAKTransaction = useMemo(() => {
    let tx;
    try {
      tx = {
        receiverId: account.accountId,
        actions: [transactions.addKey(KeyPair.fromString(account.key), transactions.fullAccessKey())]
      };
    } catch (error) {
      tx = null;
    }
    return tx;
  }, [account]);
  const estimatedAddFAKTransactionFees = useMemo(() => addFAKTransaction ? getEstimatedFees([addFAKTransaction]) : new BN('0') ,[addFAKTransaction]);
  const dispatch = useDispatch();

  useEffect(() => {
    setKeyType(null);
    setAccountBalance(null);
    setShowTxDetails(false);
    setAddingKey(false);
    setError(false);

    let keyPair;

    try {
      keyPair = KeyPair.fromString(account.key).getPublicKey().toString();
    } catch (error) {
      setError(true);
      setKeyType(wallet.KEY_TYPES.OTHER);
    }

    if (keyPair) {
      wallet
        .getPublicKeyType(
            account.accountId,
            keyPair
        )
        .then(setKeyType).catch(() => {
          setError(true);
          setKeyType(wallet.KEY_TYPES.OTHER);
        });
    }

    wallet
        .getBalance(account.accountId)
        .then(({ available }) => setAccountBalance(available));
  },[account]);

  const addKeyToWalletKeyStore = useCallback(() => {
      setAddingKey(true);
      setError(false);
      let keyPair;

      try {
        keyPair = KeyPair.fromString(account.key);
      } catch (error) {
        setError(true);
        setAddingKey(false);
      }
      
      if (keyPair) {
        wallet
          .addExistingAccountKeyToWalletKeyStore(
              account.accountId,
              keyPair
          )
          .then(() => {
            console.log('added');
            dispatch(refreshAccountOwner({}));
          })
          .then(onSuccess).catch(() => {
            setError(true);
            setAddingKey(false);
          });
      }
      
  }, [setAddingKey, setError, onSuccess, account]);

  return (
      <Modal
          isOpen={account}
          modalSize="md"
          modalClass="slim"
          onClose={() => {}}
          disableClose
      >
          {showTxDetails ? (
              <SignTransactionDetails
                  onClickGoBack={() => setShowTxDetails(false)}
                  transactions={[addFAKTransaction]}
                  signGasFee={estimatedAddFAKTransactionFees.toString()}
              />
          ) : (
              <ModalContainer>
                  <h3>
                      <Translate id="batchImportAccounts.confirmImportModal.title" />
                  </h3>
                  <ConnectWithApplication appReferrer={accountUrlReferrer} />
                  <SignTransaction
                      sender={account.accountId}
                      availableBalance={accountBalance}
                      estimatedFees={keyType === wallet.KEY_TYPES.FAK ? estimatedAddFAKTransactionFees : '0'}
                      fromLabelId="batchImportAccounts.confirmImportModal.accountToImport"
                  />
                  {keyType === wallet.KEY_TYPES.FAK ? (
                      <FormButton className="link" onClick={() => setShowTxDetails(true)}>
                          <Translate id="batchImportAccounts.confirmImportModal.transactionDetails" />
                      </FormButton>
                  ) : null}
                  {error ? <div className='error-label'><Translate id="reduxActions.default.error" /></div> : null}
                  <FormButtonGroup>
                      <FormButton onClick={onFail} className="gray-blue">
                          <Translate id="button.cancel" />
                      </FormButton>
                      <FormButton
                          onClick={addKeyToWalletKeyStore}
                          disabled={
                              !keyType || keyType === wallet.KEY_TYPES.OTHER
                          }
                          sending={addingKey}
                      >
                          <Translate id="button.approve" />
                      </FormButton>
                  </FormButtonGroup>
              </ModalContainer>
          )}
      </Modal>
  );
};

export default BatchImportAccounts;