// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

interface IControlContract {
    
    struct Operation {
        address addr;
        string method;
        string params;
        uint256 minimum;
        uint256 fraction;
        EnumerableSetUpgradeable.AddressSet endorsedAccounts;
        bool proceed;
        uint8 proceededRole;
        bool success;
        bytes msg;
        bool exists;
    }
    
    struct Method {
        address addr;
        string method;
        uint256 minimum;
        uint256 fraction;
        bool exists;
        EnumerableSetUpgradeable.UintSet invokeRolesAllowed;
        EnumerableSetUpgradeable.UintSet endorseRolesAllowed;
    }

    struct Group {
        uint256 index;
        uint256 lastSeenTime;
        EnumerableSetUpgradeable.UintSet invokeRoles;
        EnumerableSetUpgradeable.UintSet endorseRoles;
        mapping(uint256 => Operation) operations;
        mapping(uint40 => uint256) pairWeiInvokeId;
        bool active;
    }


    struct GroupRolesSetting {
        uint8 invokeRole;
        uint8 endorseRole;
    }

    function init(
        address communityAddr,
        GroupRolesSetting[] memory groupRoles,
        address costManager,
        address producedBy
    ) external;
}