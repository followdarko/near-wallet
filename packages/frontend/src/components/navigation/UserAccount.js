import React from 'react';
import styled from 'styled-components';

import classNames from '../../utils/classNames';
import ClickToCopy from '../common/ClickToCopy';
import ChevronIcon from '../svg/ChevronIcon';
import UserIcon from '../svg/UserIcon';
import CopyIcon from '../svg/CopyIcon';

const Container = styled.div`
    background-color: #F0F0F1;
    display: flex;
    align-items: center;
    border-radius: 40px;
    padding: 2px 5px 2px 2px;
    cursor: pointer;
    user-select: none;

    .user-icon {
        min-width: 36px;
        min-height: 36px;
        .background {
            fill: transparent;
        }
    }

    .account-wrapper {
        font-weight: 600;
        font-size: 14px;
        margin: 0 14px 0 9px;
        white-space: nowrap;
        max-width: 150px;
        
        color: #72727A;
        display: flex;
        align-items: center;

        @media (max-width: 991px) {
            margin: 0 14px 0 12px;
        }

        .account-id {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .copy-wrapper {
            margin-left: 10px;
        }
    }

    .icon-wrapper {
        background-color: #E5E5E6;
        min-width: 28px;
        min-height: 28px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transform: rotate(90deg);

        svg {
            width: 7px;
        }
    }

    &.no-click {
        pointer-events: none;

        .icon-wrapper {
            display: none;
        }
    }
`;

const UserAccount = ({ accountId = '', onClick, withIcon = true, flowLimitationSubMenu }) => (
    <Container className={classNames(['user-account', {'no-click' : flowLimitationSubMenu }])} onClick={onClick}>
        {withIcon && <UserIcon color='#A2A2A8'/>}
        <div className="account-wrapper" data-test-id="currentUser">
            <div className="account-id">
                {accountId}
            </div>
            <div className="copy-wrapper" onClick={(e) => e.stopPropagation()}>
                <ClickToCopy copy={accountId}>
                    <CopyIcon />
                </ClickToCopy>
            </div>
        </div>
        <div className='icon-wrapper'>
            <ChevronIcon/>
        </div>
    </Container>
);

export default UserAccount;
