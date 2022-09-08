// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC1820RegistryUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777SenderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@artman325/community/contracts/interfaces/ICommunity.sol";
import "./interfaces/IControlContract.sol";
import "./lib/StringUtils.sol";
import "releasemanager/contracts/CostManagerHelper.sol";

contract ControlContract is ERC721HolderUpgradeable, IERC777RecipientUpgradeable, IERC777SenderUpgradeable, IERC1155ReceiverUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IControlContract, CostManagerHelper {
    
    using AddressUpgradeable for address;
    IERC1820RegistryUpgradeable internal constant _ERC1820_REGISTRY = IERC1820RegistryUpgradeable(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    using StringUtils for *;
    
    uint256 internal constant fractionDiv = 1e10;
    uint256 internal constant groupTimeoutActivity = 2_592_000; // 30 days

    uint8 internal constant OPERATION_SHIFT_BITS = 240;  // 256 - 16
    // Constants representing operations
    uint8 internal constant OPERATION_INITIALIZE = 0x0;
    uint8 internal constant OPERATION_INVOKE = 0x1;
    uint8 internal constant OPERATION_ENDORSE = 0x2;
    uint8 internal constant OPERATION_ADD_METHOD = 0x3;

    address communityAddress;
    uint256 internal currentGroupIndex;
    uint256 private maxGroupIndex;
    uint256 private lastRoleIndex;
    
    mapping(uint256 => uint256) roleIDs;
    mapping(bytes32 => Method) methods;
    mapping(uint256 => Group) internal groups;
    
    error RoleDoesNotExists(uint8 roleid);
    error MethodAlreadyRegistered(string method, uint256 minimum, uint256 fraction);
    error UnknownInvokeId(uint256 unvokeID);
    error UnknownMethod(address contractAddress, string method);
    error MissingInvokeRole(address sender);
    error MissingEndorseRole(address sender);
    error TxAlreadyEndorced(address sender);
    error TxAlreadyExecute(uint256 invokeID);
    error EmptyCommunityAddress();
    error NoGroups();
    error RolesExistsOrInvokeEqualEndorse();
    error SenderIsOutOfCurrentOwnerGroup(address sender, uint256 currentGroupIndex);

    //----------------------------------------------------
    // modifiers section 
    //----------------------------------------------------
    modifier canInvoke(
        address contractAddress, 
        string memory method, 
        address sender
    ) 
    {
        bool s = false;
        bytes32 k = keccak256(abi.encodePacked(contractAddress,method));
        uint8[] memory roles = ICommunity(communityAddress).getRoles(sender);
        for (uint256 i = 0; i < roles.length; i++) {
            if (methods[k].invokeRolesAllowed.contains(roleIDs[roles[i]])) {
                s = true;
            }
        }
        if (s == false) {
            revert MissingInvokeRole(sender);
        }
        _;
    }
    
    //----------------------------------------------------
    // events section 
    //----------------------------------------------------
    event OperationInvoked(uint256 indexed invokeID, uint40 invokeIDWei,  address contractAddress, string method, string params);
    event OperationEndorsed(uint256 indexed invokeID, uint40 invokeIDWei);
    event OperationExecuted(uint256 indexed invokeID, uint40 invokeIDWei);
    event HeartBeat(uint256 groupIndex, uint256 time);
    event CurrentGroupIndexChanged(uint256 from, uint256 to, uint256 time);
  
    //----------------------------------------------------
    // external section 
    //----------------------------------------------------
    receive() external payable {
        heartbeat();
        uint256 invokeID = groups[currentGroupIndex].pairWeiInvokeId[uint40(msg.value)];
        _endorse(invokeID);
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external 
    {
    }

    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external
    {
    }

    function onERC1155Received(
        address /*operator*/,
        address /*from*/,
        uint256 /*id*/,
        uint256 /*value*/,
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    function onERC1155BatchReceived(
        address /*operator*/,
        address /*from*/,
        uint256[] calldata /*ids*/,
        uint256[] calldata /*values*/,
        bytes calldata/* data*/
    ) external pure returns (bytes4) {
        return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IControlContract).interfaceId;
    }

    
    //----------------------------------------------------
    // public section 
    //----------------------------------------------------
    /**
     * @dev here invokeRole can equal endorseRole withih one group but can't be in other groups
     * @param communityAddr community address
     * @param groupRoles tuples of GroupRolesSetting
     * @param costManager costManager address
     * @param producedBy producedBy address
     * @custom:calledby factory
     * @custom:shortd initialize while factory produce
     */
    function init(
        address communityAddr,
        GroupRolesSetting[] memory groupRoles,
        address costManager,
        address producedBy
    )
        public 
        initializer
    {
        __CostManagerHelper_init(_msgSender());
        _setCostManager(costManager);

        __Ownable_init();
        __ReentrancyGuard_init();
        
        communityAddress = communityAddr;
        lastRoleIndex = 0;
        
        /*
        [   //  invokeRole         endorseRole
            [Role#1Group#1,Role#5Group#1],
            [Role#2Group#2,Role#6Group#2],
            [Role#3Group#3,Role#7Group#3],
            [Role#4Group#4,Role#8Group#4]
        ]
        */
        if (
            (address(communityAddr) == address(0)) || ((address(communityAddr).isContract()) == false)
        ) {
            revert EmptyCommunityAddress();
        }
        if (groupRoles.length == 0) { 
            revert NoGroups();
        }
        
        currentGroupIndex = 0;
        maxGroupIndex = groupRoles.length;
        for (uint256 i = 0; i < groupRoles.length; i++) {
            
            if (
                (roleExists(groupRoles[i].invokeRole) == true) ||
                (roleExists(groupRoles[i].endorseRole) == true) ||
                (keccak256(abi.encodePacked(groupRoles[i].invokeRole)) == keccak256(abi.encodePacked(groupRoles[i].endorseRole)))
            ) {
                revert RolesExistsOrInvokeEqualEndorse();
            }

            groups[i].index = maxGroupIndex;
            groups[i].lastSeenTime = block.timestamp;
            groups[i].invokeRoles.add(roleAdd(groupRoles[i].invokeRole));
            groups[i].endorseRoles.add(roleAdd(groupRoles[i].endorseRole));
            
        }

        // register interfaces
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC20Token"), address(this));
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777Token"), address(this));
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777TokensSender"), address(this));
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));

        _accountForOperation(
            OPERATION_INITIALIZE << OPERATION_SHIFT_BITS,
            uint256(uint160(producedBy)),
            0
        );
    }
    
    /**
     * @param contractAddress address of external token
     * @param method method of external token that would be executed
     * @param params params of external token's method
     * @return invokeID identificator
     * @custom:calledby persons with invoke roles
     * @custom:shortd invoke methods
     */
    function invoke(
        address contractAddress,
        string memory method,
        string memory params
    )
        public 
        canInvoke(contractAddress, method, _msgSender())
        returns(uint256 invokeID, uint40 invokeIDWei)
    {
        bytes32 k = keccak256(abi.encodePacked(contractAddress,method));
        if (methods[k].exists == false) {
            revert UnknownMethod(contractAddress, method);
        }
        
        heartbeat();
        
        invokeID = generateInvokeID();
        invokeIDWei = uint40(invokeID);
        
        groups[currentGroupIndex].pairWeiInvokeId[invokeIDWei] = invokeID;
        
        emit OperationInvoked(invokeID, invokeIDWei, contractAddress, method, params);
        
        groups[currentGroupIndex].operations[invokeID].addr = methods[k].addr;
        groups[currentGroupIndex].operations[invokeID].method = methods[k].method;
        groups[currentGroupIndex].operations[invokeID].params = params;
        groups[currentGroupIndex].operations[invokeID].minimum = methods[k].minimum;
        groups[currentGroupIndex].operations[invokeID].fraction = methods[k].fraction;
        
        groups[currentGroupIndex].operations[invokeID].exists = true;
        
        _accountForOperation(
            OPERATION_INVOKE << OPERATION_SHIFT_BITS,
            uint256(uint160(contractAddress)),
            0
        );
    }
    
    /**
     * @param invokeID invoke identificator
     * @custom:calledby persons with endorse roles
     * @custom:shortd endorse methods by invokeID
     */
    function endorse(
        uint256 invokeID
    ) 
        public
    {
        heartbeat();
        _endorse(invokeID);
    }

    /**
     * @param contractAddress token's address
     * @param method hexademical method's string
     * @param invokeRoleId invoke role id
     * @param endorseRoleId endorse role id
     * @param minimum  minimum
     * @param fraction fraction value mul by 1e10
     * @custom:calledby owner
     * @custom:shortd adding method to be able to invoke
     */
    function addMethod(
        address contractAddress,
        string memory method,
        uint8 invokeRoleId,
        uint8 endorseRoleId,
        uint256 minimum,
        uint256 fraction
    )
        public 
        onlyOwner 
    {
        bytes32 k = keccak256(abi.encodePacked(contractAddress,method));
        
        if (
            !roleExists(invokeRoleId) || 
            !roleExists(invokeRoleId)
        ) {
            revert RoleDoesNotExists(invokeRoleId);
        }
        
        // require(methods[k].exists == false, "Such method has already registered");
        if (methods[k].exists == false) {

        } else {
            if ((methods[k].minimum == minimum) && (methods[k].fraction == fraction)) {
            } else {
                revert MethodAlreadyRegistered(method, minimum, fraction);
            }
        }
        
        methods[k].exists = true;
        methods[k].addr = contractAddress;
        methods[k].method = method;
        methods[k].minimum = minimum;
        methods[k].fraction = fraction;
        methods[k].invokeRolesAllowed.add(roleIDs[invokeRoleId]);
        methods[k].endorseRolesAllowed.add(roleIDs[endorseRoleId]);
        
        _accountForOperation(
            OPERATION_ADD_METHOD << OPERATION_SHIFT_BITS,
            uint256(uint160(contractAddress)),
            0
        );
    }

    /**
     * prolonging user current group ownership. 
     * or transferring to next if previous expired
     * or restore previous if user belong to group which index less then current
     * @custom:calledby anyone
     * @custom:shortd prolonging user current group ownership
     */
    function heartbeat(
    ) 
        public
    {
    
        uint256 len = 0;
        uint256 ii = 0;
        
        uint8[] memory roles = ICommunity(communityAddress).getRoles(_msgSender());
        for (uint256 i = 0; i < maxGroupIndex; i++) {
            for (uint256 j = 0; j < roles.length; j++) {
                if (
                    groups[i].invokeRoles.contains(roleIDs[roles[j]]) ||
                    groups[i].endorseRoles.contains(roleIDs[roles[j]])
                ) {
                    len += 1;
                }
          }
        }
        
        uint256[] memory userRoleIndexes = new uint256[](len);
        for (uint256 i = 0; i < maxGroupIndex; i++) {
            for (uint256 j = 0; j < roles.length; j++) {
                if (
                    groups[i].invokeRoles.contains(roleIDs[roles[j]]) ||
                    groups[i].endorseRoles.contains(roleIDs[roles[j]])
                ) {
                    
                    userRoleIndexes[ii] = i;
                    ii += 1;
                }
            }
        }
        
        uint256 expectGroupIndex = _getExpectGroupIndex();

        bool isBreak = false;
        uint256 itGroupIndex;

        for (uint256 i = 0; i <= expectGroupIndex; i++) {
            for (uint256 j = 0; j < userRoleIndexes.length; j++) { 
                if (i == userRoleIndexes[j]) {
                    itGroupIndex = i;
                    isBreak = true;
                    break;
                }
            }
            if (isBreak) {
                break;
            }
        }

        if (!isBreak) {
            revert SenderIsOutOfCurrentOwnerGroup(_msgSender(), currentGroupIndex);
        }
        
        if (currentGroupIndex != itGroupIndex) {
            emit CurrentGroupIndexChanged(currentGroupIndex, itGroupIndex, block.timestamp);
        }
        currentGroupIndex = itGroupIndex;
        groups[itGroupIndex].lastSeenTime = block.timestamp;
        
        emit HeartBeat(currentGroupIndex, block.timestamp);

    }
    
    /**
     * @return index expected groupIndex.
     * @custom:calledby anyone
     * @custom:shortd showing expected group index
     */
    function getExpectGroupIndex(
    ) 
        public 
        view 
        returns(uint256 index) 
    {
        return _getExpectGroupIndex();
    }

    //----------------------------------------------------
    // internal section 
    //----------------------------------------------------
    
    /**
    * @return index expected groupIndex.
    */
    function _getExpectGroupIndex(
    ) 
        internal
        view 
        returns(uint256 index) 
    {
        index = currentGroupIndex;
        if (groups[currentGroupIndex].lastSeenTime + groupTimeoutActivity < block.timestamp) {
            index = currentGroupIndex + (
                (block.timestamp - groups[currentGroupIndex].lastSeenTime) / groupTimeoutActivity
            );
            if (maxGroupIndex <= index) {
                index = maxGroupIndex-1;
            }
        }
    }

    /**
     * @param invokeID invoke identificator
     */
    function _endorse(
        uint256 invokeID
    ) 
        internal
        nonReentrant()
    {
        Operation storage operation = groups[currentGroupIndex].operations[invokeID];
        // note that `invokeID` can be zero if come from _receive !! and tx should be revert
        if (operation.exists == false) {revert UnknownInvokeId(invokeID);}

        uint8[] memory roles = getEndorsedRoles(operation.addr, operation.method, _msgSender());
        if (roles.length == 0) {
            revert MissingEndorseRole(_msgSender());
        }
        
        if (operation.endorsedAccounts.contains(_msgSender()) == true) {
            revert TxAlreadyEndorced(_msgSender());
        }
        
        if (operation.proceed == true) {
            revert TxAlreadyExecute(invokeID);
        }
        
        operation.endorsedAccounts.add(_msgSender());
        
        emit OperationEndorsed(invokeID, uint40(invokeID));
        
        uint256 memberCount;
        for (uint256 i = 0; i < roles.length; i++) {
            memberCount = ICommunity(communityAddress).addressesCount(roles[i]);
            //---
            uint256 max;
            max = memberCount * (operation.fraction) / (fractionDiv);
            if (operation.minimum > max) {
                max = operation.minimum;
            }
            //---
            if (operation.endorsedAccounts.length() >= max) {
                operation.proceed = true;
                (
                    operation.success, 
                    operation.msg
                ) = operation.addr.call(
                    (
                        string(abi.encodePacked(
                            operation.method, 
                            operation.params
                        ))
                    ).fromHex()
                );
                emit OperationExecuted(invokeID, uint40(invokeID));
            }
        }

        _accountForOperation(
            OPERATION_ENDORSE << OPERATION_SHIFT_BITS,
            uint256(uint160(_msgSender())),
            uint256(uint160(operation.addr))
        );
    }
 
    
    /**
     * getting all endorse roles by sender's address and expected pair contract/method
     * 
     * @param contractAddress token's address
     * @param method hexademical method's string
     * @param sender sender address
     * @return endorse roles 
     */
    function getEndorsedRoles(
        address contractAddress, 
        string memory method, 
        address sender
    ) 
        internal 
        view 
        returns(uint8[] memory) 
    {
        uint8[] memory roles = ICommunity(communityAddress).getRoles(sender);
        uint256 len;

        for (uint256 i = 0; i < roles.length; i++) {
            if (methods[keccak256(abi.encodePacked(contractAddress,method))].endorseRolesAllowed.contains(roleIDs[roles[i]])) {
                len += 1;
            }
        }
        uint8[] memory list = new uint8[](len);
        uint256 j = 0;
        for (uint256 i = 0; i < roles.length; i++) {
            if (methods[keccak256(abi.encodePacked(contractAddress,method))].endorseRolesAllowed.contains(roleIDs[roles[i]])) {
                list[j] = roles[i];
                j += 1;
            }
        }
        return list;
    }
    
    /**
     * adding role to general list
     * 
     * @param roleId roleid
     * 
     * @return index true if was added and false if already exists
     */
    function roleAdd(
        uint8 roleId
    ) 
        internal 
        returns(uint256 index) 
    {
        if (roleIDs[roleId] == 0) {
            lastRoleIndex += 1;
            roleIDs[roleId] = lastRoleIndex;
            index = lastRoleIndex;
        } else {
            index = roleIDs[roleId];
        }
    }
    
    /**
     * @param roleId role id
     * @return ret true if roleName exists in general list
     */
    function roleExists(
        uint8 roleId
    ) 
        internal 
        view
        returns(bool ret) 
    {
        ret = (roleIDs[roleId] == 0) ? false : true;
    }
    
    /**
     * generating pseudo-random id used as invoke identificator
     * @return invoke identificator
     */
    function generateInvokeID(
    ) 
        internal 
        view 
        returns(uint256) 
    {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.difficulty, 
            msg.sender
        )));    
    }
    

}

