const { ethers} = require('hardhat');
const { expect } = require('chai');
//const chai = require('chai');
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
//const { expect } = require('chai'); 

require("@nomicfoundation/hardhat-chai-matchers");

const { 
    deployBase,
    deployWithoutDelay,
    deployWithDelay,
    deploy,
    deployForTimetests,
    deployForTokensTransfer
} = require("./fixtures/deploy.js");

// const ZERO = BigNumber.from('0');
// const ONE = BigNumber.from('1');
// const TWO = BigNumber.from('2');
// const THREE = BigNumber.from('3');
// const FOUR = BigNumber.from('4');
// const FIVE = BigNumber.from('5');
// const SEVEN = BigNumber.from('7');
// const TEN = BigNumber.from('10');
// const HUNDRED = BigNumber.from('100');
// const THOUSAND = BigNumber.from('1000');
// const ONE_ETH = ethers.utils.parseEther('1');



describe("Community", function () {
    
    it('validate input params', async () => {
        const {
            owner,
            ZERO_ADDRESS,
            WITHOUT_DELAY,
            ControlContractFactory,
            ControlContractF, 
            CommunityMock
        } = await loadFixture(deployBase);
        //['sub-admins','members']
        await expect(
            ControlContractFactory.connect(owner).produce(ZERO_ADDRESS, [[1,2]], WITHOUT_DELAY)
        ).to.be.revertedWithCustomError(ControlContractF, "EmptyCommunityAddress");

        await expect(
            ControlContractFactory.connect(owner).produce(CommunityMock.target, [], WITHOUT_DELAY)
        ).to.be.revertedWithCustomError(ControlContractF, "NoGroups");

        //['sub-admins','members'],['admins','sub-admins']
        await expect(
            ControlContractFactory.connect(owner).produce(CommunityMock.target, [[1,2],[3,1]], WITHOUT_DELAY)
        ).to.be.revertedWithCustomError(ControlContractF, "RoleExistsOrInvokeEqualEndorse");

    });

    it('factory instances count', async () => {
        const {
            owner,
            WITHOUT_DELAY,
            ControlContractFactory,
            CommunityMock
        } = await loadFixture(deployBase);

        let instancesCountBefore = await ControlContractFactory.instancesCount();

        await ControlContractFactory.connect(owner).produce(CommunityMock.target, [[1,2]], WITHOUT_DELAY);
        await ControlContractFactory.connect(owner).produce(CommunityMock.target, [[3,4]], WITHOUT_DELAY);
        await ControlContractFactory.connect(owner).produce(CommunityMock.target, [[5,6]], WITHOUT_DELAY);
        
        let instancesCountAfter = await ControlContractFactory.instancesCount();
        expect(instancesCountAfter - instancesCountBefore).to.be.eq(3n);
    });

    describe("ControlContract tests", function () {
    
        describe("simple test methods", function () {
           
            it('with no params', async () => {
                const {
                    owner,
                    alice,
                    bob,
                    charlie,
                    rolesIndex,
                    WITHOUT_EXECUTION_DELAY,
                    SomeExternalMock,
                    ControlContract
                } = await loadFixture(deployWithoutDelay);
                
                var counterBefore = await SomeExternalMock.viewCounter();
                
                let funcHexademicalStr = await SomeExternalMock.returnFuncSignatureHexadecimalString();
                // await ControlContractInstance.allowInvoke('sub-admins',SomeExternalMockInstance.address,funcHexademicalStr,{ from: accountTen });
                // await ControlContractInstance.allowEndorse('members',SomeExternalMockInstance.address,funcHexademicalStr,{ from: accountTen });
                await ControlContract.connect(owner).addMethod(
                    SomeExternalMock.target,
                    funcHexademicalStr
                )
                var invokeID; 

                let tx,rc,event;

                tx = await ControlContract.connect(alice).invoke(
                    SomeExternalMock.target,
                    funcHexademicalStr,
                    '', //string memory params
                    2, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );
                
                rc = await tx.wait(); // 0ms, as tx is already confirmed
                event = rc.logs.find(event => event.fragment.name === 'OperationInvoked');
                //invokeID, invokeIDWei, tokenAddr, method, params
                [invokeID,,,,] = event.args;

                await ControlContract.connect(bob).endorse(invokeID);

                await ControlContract.connect(charlie).endorse(invokeID);
                
                var counterAfter = await SomeExternalMock.viewCounter();
                
                expect(counterAfter-counterBefore).to.be.eq(1);
                
            });

            it('with params (mint tokens)', async () => {
               
                const {
                    owner,
                    alice,
                    bob,
                    charlie,
                    david,
                    rolesIndex,
                    WITHOUT_EXECUTION_DELAY,                    
                    ERC20Mintable,
                    ControlContract
                } = await loadFixture(deployWithoutDelay);

                await ERC20Mintable.connect(owner).transferOwnership(ControlContract.target);
                
                var counterBefore = await ERC20Mintable.balanceOf(david.address);

                // mint to david 10 tokens    
                //0x40c10f19000000000000000000000000ea674fdde714fd979de3edf0f56aa9716b898ec80000000000000000000000000000000000000000000000008ac7230489e80000
                const populatedTx = await ERC20Mintable.mint.populateTransaction(david.address, ethers.parseEther("10.0"));

                // let funcHexademicalStr = '40c10f19';
                // let memoryParamsHexademicalStr = '000000000000000000000000'+((david.address).replace('0x',''))+'0000000000000000000000000000000000000000000000008ac7230489e80000';
                let funcHexademicalStr = populatedTx.data.substr(2,8);
                let memoryParamsHexademicalStr = populatedTx.data.substr(10,populatedTx.data.length-10);

                // await ControlContractInstance.allowInvoke('sub-admins',ERC20MintableInstance.address,funcHexademicalStr,{ from: accountTen });
                // await ControlContractInstance.allowEndorse('members',ERC20MintableInstance.address,funcHexademicalStr,{ from: accountTen });
                await ControlContract.connect(owner).addMethod(
                    ERC20Mintable.target,
                    funcHexademicalStr
                    // rolesIndex.get('sub-admins'),
                    // rolesIndex.get('members')
                )
                
                var invokeID,invokeIDWei; 

                let tx = await ControlContract.connect(alice).invoke(
                    ERC20Mintable.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    2, //minimum,
                    1, //fraction
                    WITHOUT_EXECUTION_DELAY
                );
                
                let rc = await tx.wait(); // 0ms, as tx is already confirmed
                let event = rc.logs.find(event => event.fragment.name === 'OperationInvoked');
                //invokeID, invokeIDWei, tokenAddr, method, params
                [invokeID,invokeIDWei,,,] = event.args;

                await ControlContract.connect(bob).endorse(invokeID);

                await expect(
                    bob.sendTransaction({to: ControlContract.target, value: invokeIDWei, gasLimit:10000000n})
                ).to.be.revertedWithCustomError(ControlContract, 'AlreadyEndorsed').withArgs(bob.address);

                await expect(
                    charlie.sendTransaction({to: ControlContract.target, value: invokeIDWei+2n, gasLimit:80000n})
                ).to.be.revertedWithCustomError(ControlContract, 'UnknownInvokeId').withArgs(0);

                await charlie.sendTransaction({to: ControlContract.target, value: invokeIDWei})
                
                
                var counterAfter = await ERC20Mintable.balanceOf(david.address);

                expect(counterAfter - counterBefore).to.be.eq(ethers.parseEther('10'));
                
            });

            it('itself call', async () => {
                    
                const {
                    owner,
                    alice,
                    bob,
                    charlie,
                    rolesIndex,
                    WITHOUT_EXECUTION_DELAY,
                    ControlContract
                } = await loadFixture(deployWithoutDelay);

                await expect(
                    ControlContract.setInsideVar(2)
                ).to.be.revertedWith("able to call from itself only");

                var insideVarBefore = await ControlContract.getInsideVar();

                // call test mock method setInsideVar(uint256 i) 
                // 0xfdf172c20000000000000000000000000000000000000000000000000000000000000002
                // setInsideVar(2)
                let funcHexademicalStr = 'fdf172c2';
                let memoryParamsHexademicalStr = '0000000000000000000000000000000000000000000000000000000000000002';

                await ControlContract.connect(owner).addMethod(
                    ControlContract.target,
                    funcHexademicalStr
                );
                
                var invokeID,invokeIDWei; 

                let tx = await ControlContract.connect(alice).invoke(
                    ControlContract.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    2, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );
                
                let rc = await tx.wait(); // 0ms, as tx is already confirmed
                let event = rc.logs.find(event => event.fragment.name === 'OperationInvoked');
                //invokeID, invokeIDWei, tokenAddr, method, params
                [invokeID,invokeIDWei,,,] = event.args;

                await ControlContract.connect(bob).endorse(invokeID);

                await charlie.sendTransaction({to: ControlContract.target, value: invokeIDWei, gasLimit:10000000n})
                
                var insideVarAfter = await ControlContract.getInsideVar();

                expect(insideVarBefore).to.be.eq(0n);
                expect(insideVarAfter).to.be.eq(2n);
                

            });

        });

        describe("simple test methods with delay execution ", function () {
            
            it('with no params', async () => {
                const {
                    owner,
                    alice,
                    bob,
                    charlie,
                    rolesIndex,
                    WITH_DELAY,
                    WITHOUT_EXECUTION_DELAY,
                    ControlContract
                } = await loadFixture(deployWithDelay);

                var SomeExternalMockF = await ethers.getContractFactory("SomeExternalMock");
                var SomeExternalMock = await SomeExternalMockF.connect(owner).deploy();

                var counterBefore = await SomeExternalMock.viewCounter();
                
                let funcHexademicalStr = await SomeExternalMock.returnFuncSignatureHexadecimalString();
                // await ControlContractInstance.allowInvoke('sub-admins',SomeExternalMockInstance.address,funcHexademicalStr,{ from: accountTen });
                // await ControlContractInstance.allowEndorse('members',SomeExternalMockInstance.address,funcHexademicalStr,{ from: accountTen });
                await ControlContract.connect(owner).addMethod(
                    SomeExternalMock.target,
                    funcHexademicalStr
                )
                var invokeID; 

                let tx = await ControlContract.connect(alice).invoke(
                    SomeExternalMock.target,
                    funcHexademicalStr,
                    '', //string memory params
                    2, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );
                
                let rc = await tx.wait(); // 0ms, as tx is already confirmed
                let event = rc.logs.find(event => event.fragment.name === 'OperationInvoked');
                //invokeID, invokeIDWei, tokenAddr, method, params
                [invokeID,,,,] = event.args;

                await ControlContract.connect(bob).endorse(invokeID);
                await ControlContract.connect(charlie).endorse(invokeID);
                
                var counterAfter = await SomeExternalMock.viewCounter();
                expect(counterAfter-counterBefore).to.be.eq(0n);

                // pass time
                await time.increase(WITH_DELAY);
                // this one will have 02:00 PM as its timestamp

                await ControlContract.connect(charlie).execute(invokeID);
                
                var counterAfter2 = await SomeExternalMock.viewCounter();
                expect(counterAfter2-counterBefore).to.be.eq(1n);
                
            });
        });

        describe("example transferownersip", function () {

            it('change ownership of destination erc20 token', async () => {
                const res = await loadFixture(deploy);
                const {
                    owner,
                    alice,
                    bob,
                    charlie,
                    eve,
                    rolesIndex,
                    WITHOUT_EXECUTION_DELAY,
                    ERC20Mintable,
                    CommunityMock,
                    ControlContract
                } = res;
                // [
                //     [rolesIndex.get('group1_can_invoke'),rolesIndex.get('group1_can_endorse')],
                //     [rolesIndex.get('group2_can_invoke'),rolesIndex.get('group2_can_endorse')],
                // ], 
                await CommunityMock.setRoles(alice.address, [rolesIndex.get('group1_can_invoke')]);
                await CommunityMock.setRoles(bob.address, [rolesIndex.get('group1_can_endorse')]);
                await CommunityMock.setRoles(charlie.address, [rolesIndex.get('group1_can_endorse')]);
                
                // change ownership of ERC20MintableInstance to eve
                // 0xf2fde38b000000000000000000000000ea674fdde714fd979de3edf0f56aa9716b898ec8
                const funcHexademicalStr = 'f2fde38b';
                const memoryParamsHexademicalStr = '000000000000000000000000'+(eve.address.replace('0x',''));

                var oldOwnerOfErc20 = await ERC20Mintable.owner();

                await ControlContract.connect(owner).addMethod(
                    ERC20Mintable.target,
                    funcHexademicalStr
                )
                
                let tx = await ControlContract.connect(alice).invoke(
                    ERC20Mintable.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    2, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );
                
                var invokeID; 

                let rc = await tx.wait(); // 0ms, as tx is already confirmed
                let event = rc.logs.find(event => event.fragment.name === 'OperationInvoked');
                //invokeID, invokeIDWei, tokenAddr, method, params
                [invokeID,,,,] = event.args;

                await ControlContract.connect(bob).endorse(invokeID);
                await ControlContract.connect(charlie).endorse(invokeID);
                
                var newOwnerOfErc20 = await ERC20Mintable.owner();
                
                expect(oldOwnerOfErc20).not.to.be.eq(eve.address);
                expect(newOwnerOfErc20).to.be.eq(eve.address);

            });
        }); 

        describe("time tests", function () {

            it('group index', async () => {
                const res = await loadFixture(deployForTimetests);
                const {
                    owner,
                    groupTimeoutActivity,
                    ControlContract
                } = res;

                const groupIndex1 = await ControlContract.connect(owner).getExpectGroupIndex();

                await time.increase(groupTimeoutActivity+10n);
                const groupIndex2 = await ControlContract.connect(owner).getExpectGroupIndex();

                await time.increase(groupTimeoutActivity+10n);
                const groupIndex3 = await ControlContract.connect(owner).getExpectGroupIndex();

                await time.increase(groupTimeoutActivity+10n);
                const groupIndex4 = await ControlContract.connect(owner).getExpectGroupIndex();

                expect(groupIndex1).not.to.be.eq(groupIndex2);
                expect(groupIndex1+1n).to.be.eq(groupIndex2);
                expect(groupIndex2).to.be.eq(groupIndex3);
                expect(groupIndex2).to.be.eq(groupIndex4);

            });

            it('heartbeat test', async () => {
                const res = await loadFixture(deployForTimetests);
                const {
                    owner,
                    alice,
                    charlie,
                    rolesIndex,
                    groupTimeoutActivity,
                    WITHOUT_EXECUTION_DELAY,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr,
                    ERC20Mintable,
                    ControlContract
                } = res;

                await ControlContract.connect(owner).addMethod(
                    ERC20Mintable.target,
                    funcHexademicalStr
                    // rolesIndex.get('group1_can_invoke'),
                    // rolesIndex.get('group1_can_endorse'),
                )
                
                await expect(
                    ControlContract.connect(owner).addMethod(
                        ERC20Mintable.target,
                        funcHexademicalStr
                        // rolesIndex.get('group2_can_invoke'),
                        // rolesIndex.get('group2_can_endorse'),
                    )
                ).to.be.revertedWithCustomError(ControlContract, 'MethodAlreadyRegistered').withArgs(ERC20Mintable.target, funcHexademicalStr);
                
                // await ControlContract.connect(owner).addMethod(
                //     ERC20Mintable.target,
                //     funcHexademicalStr
                //     // rolesIndex.get('group2_can_invoke'),
                //     // rolesIndex.get('group2_can_endorse'),
                    
                // );
                
                var invokeID,invokeIDWei,currentGroupIndex; 
                await ControlContract.connect(alice).heartbeat();
                
                currentGroupIndex = await ControlContract.getCurrentGroupIndex();
                // now active is group1
                // group 2 can not endorse or invoke
                await expect(
                    ControlContract.connect(charlie).invoke(
                        ERC20Mintable.target,
                        funcHexademicalStr,
                        memoryParamsHexademicalStr, //string memory params
                        1, //uint256 minimum,
                        1, //uint256 fraction
                        WITHOUT_EXECUTION_DELAY
                    )
                ).to.be.revertedWithCustomError(ControlContract, 'SenderIsNotInCurrentOwnerGroup').withArgs(charlie.address, currentGroupIndex);
                                      

                // pass groupTimeoutActivity = 30 days + extra seconds
                // NOTE: next transaction after advanceTimeAndBlock can be in block with +1or+0 seconds blocktimestamp. so in invoke we get the exact groupTimeoutActivity pass. in the end of period group is still have ownership.
                await time.increase(groupTimeoutActivity+10n)
                // await network.provider.send("evm_increaseTime", [parseInt(groupTimeoutActivity)+10]);
                // await network.provider.send("evm_mine");

                // and again
                await ControlContract.connect(charlie).invoke(
                    ERC20Mintable.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    1, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );

                //return ownership by alice for group1
                await ControlContract.connect(alice).heartbeat();

                currentGroupIndex = await ControlContract.getCurrentGroupIndex();
                // now active is group1
                // group 2 can not endorse or invoke
                await expect(
                    ControlContract.connect(charlie).invoke(
                        ERC20Mintable.target,
                        funcHexademicalStr,
                        memoryParamsHexademicalStr, //string memory params
                        1, //uint256 minimum,
                        1, //uint256 fraction
                        WITHOUT_EXECUTION_DELAY
                    )
                ).to.be.revertedWithCustomError(ControlContract, 'SenderIsNotInCurrentOwnerGroup').withArgs(charlie.address, currentGroupIndex);

                
            });

            it('if first group#1 is not active, group#2 can be able to invoke', async () => {

                const res = await loadFixture(deployForTimetests);
                const {
                    owner,
                    charlie,
                    rolesIndex,
                    groupTimeoutActivity,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr,
                    WITHOUT_EXECUTION_DELAY,
                    ERC20Mintable,
                    ControlContract
                } = res;

                await ControlContract.connect(owner).addMethod(
                    ERC20Mintable.target,
                    funcHexademicalStr
                )
                
                let currentGroupIndex = await ControlContract.getCurrentGroupIndex();
                await expect(
                    ControlContract.connect(charlie).invoke(
                        ERC20Mintable.target,
                        funcHexademicalStr,
                        memoryParamsHexademicalStr, //string memory params
                        1, //uint256 minimum,
                        1, //uint256 fraction
                        WITHOUT_EXECUTION_DELAY
                    )
                ).to.be.revertedWithCustomError(ControlContract, 'SenderIsNotInCurrentOwnerGroup').withArgs(charlie.address, currentGroupIndex);

                await time.increase(groupTimeoutActivity+10n);
                
                await ControlContract.connect(charlie).invoke(
                    ERC20Mintable.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    1, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );

            });

            it('if first group#1 lost access and then made transaction which reverted, Group#2 didnt lose `ownership`', async () => {
                
                const res = await loadFixture(deployForTimetests);
                const {
                    owner,
                    alice,
                    bob,
                    charlie,
                    rolesIndex,
                    groupTimeoutActivity,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr,
                    WITHOUT_EXECUTION_DELAY,
                    ERC20Mintable,
                    ControlContract
                } = res;
                    
                await ControlContract.connect(owner).addMethod(
                    ERC20Mintable.target,
                    funcHexademicalStr
                )
               
                await time.increase(groupTimeoutActivity+10n);
                
                await ControlContract.connect(charlie).invoke(
                    ERC20Mintable.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    1, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );
                
                let invokeIDWeiWrong = 123123;
                await expect(
                    alice.sendTransaction({to: ControlContract.target, value: invokeIDWeiWrong})
                ).to.be.revertedWithCustomError(ControlContract, 'UnknownInvokeId').withArgs(0);

                await expect(
                    ControlContract.connect(bob).endorse(invokeIDWeiWrong)
                ).to.be.revertedWithCustomError(ControlContract, 'UnknownInvokeId').withArgs(invokeIDWeiWrong);

                // group2 members still owner of contract and still can invoke
                await ControlContract.connect(charlie).invoke(
                    ERC20Mintable.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    1, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );
                
            });

            it('if first group#1 invokes transaction but in later becomes inactive, group#2 should endorce or execute transaction', async () => {
                const res = await loadFixture(deployForTimetests);
                const {
                    owner,
                    alice,
                    bob,
                    charlie,
                    david,
                    eve,
                    rolesIndex,
                    groupTimeoutActivity,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr,
                    WITHOUT_EXECUTION_DELAY,
                    ERC20Mintable,
                    ControlContract
                } = res;
                // here funcHexademicalStr and memoryParamsHexademicalStr - are trasnfer to Eve 10 tokens    
                const eveBalalanceBefore = await ERC20Mintable.balanceOf(eve.address);
                await ControlContract.connect(owner).addMethod(
                    ERC20Mintable.target,
                    funcHexademicalStr
                )
                let currentGroupIndex = await ControlContract.getCurrentGroupIndex();
                const tx = await ControlContract.connect(alice).invoke(
                    ERC20Mintable.target,
                    funcHexademicalStr,
                    memoryParamsHexademicalStr, //string memory params
                    1, //uint256 minimum,
                    1, //uint256 fraction
                    WITHOUT_EXECUTION_DELAY
                );

                let rc = await tx.wait(); // 0ms, as tx is already confirmed
                let event = rc.logs.find(event => event.fragment.name === 'OperationInvoked');
                //invokeID, invokeIDWei, tokenAddr, method, params
                var invokeID; 
                [invokeID,,,,] = event.args;

                // charlie and david are not in current owner group
                await expect(
                    ControlContract.connect(charlie).endorse(invokeID)
                ).to.be.revertedWithCustomError(ControlContract, 'SenderIsNotInCurrentOwnerGroup').withArgs(charlie.address, currentGroupIndex);

                await expect(
                    ControlContract.connect(david).endorse(invokeID)
                ).to.be.revertedWithCustomError(ControlContract, 'SenderIsNotInCurrentOwnerGroup').withArgs(david.address, currentGroupIndex);

                await time.increase(groupTimeoutActivity+10n);

                // charlie has invoke role not endorse
                await expect(
                    ControlContract.connect(charlie).endorse(invokeID)
                ).to.be.revertedWithCustomError(ControlContract, 'MissingEndorseRole').withArgs(charlie.address);

                await ControlContract.connect(david).endorse(invokeID);

                const eveBalalanceAfter = await ERC20Mintable.balanceOf(eve.address);
                expect(eveBalalanceAfter - eveBalalanceBefore).to.be.eq(ethers.parseEther('10'));
            });
            
        });
        
    });

    describe("Tokens Transfers", function () {
        
        it('ERC20: should obtain and send to some1', async () => {
            const {
                bob,
                MockERC20,
                ControlContract
            } = await loadFixture(deployForTokensTransfer);

            expect(await MockERC20.balanceOf(ControlContract.target)).to.be.eq(0n);
            //obtain
            await MockERC20.mint(ControlContract.target, 1n);
            expect(await MockERC20.balanceOf(ControlContract.target)).to.be.eq(1n);
            //send
            await ControlContract.transferERC20(MockERC20.target, bob.address, 1n);
            expect(await MockERC20.balanceOf(bob.address)).to.be.eq(1n);
            //
            expect(await MockERC20.balanceOf(ControlContract.target)).to.be.eq(0n);

        });

        it('ERC721: should obtain and send to some1', async () => {
            const {
                bob,
                MockERC721,
                ControlContract
            } = await loadFixture(deployForTokensTransfer);

            await expect(MockERC721.ownerOf(1n)).to.be.revertedWith("ERC721: invalid token ID");
            //obtain
            await MockERC721.mint(ControlContract.target, 1n);
            expect(await MockERC721.ownerOf(1n)).to.be.eq(ControlContract.target);
            //send
            await ControlContract.transferERC721(MockERC721.target, bob.address, 1n);
            expect(await MockERC721.ownerOf(1n)).to.be.eq(bob.address);
        });

        it('ERC777: should obtain and send to some1', async () => {
            const {
                bob,
                MockERC777,
                ControlContract
            } = await loadFixture(deployForTokensTransfer);

            expect(await MockERC777.balanceOf(ControlContract.target)).to.be.eq(0n);
            //obtain
            await MockERC777.mint(ControlContract.target, 1n);
            expect(await MockERC777.balanceOf(ControlContract.target)).to.be.eq(1n);
            //send
            await ControlContract.transferERC777(MockERC777.target, bob.address, 1n);
            expect(await MockERC777.balanceOf(bob.address)).to.be.eq(1n);
            //
            expect(await MockERC777.balanceOf(ControlContract.target)).to.be.eq(0n);
        });

        it('ERC1155: should obtain and send to some1', async () => {
            const {
                bob,
                MockERC1155,
                ControlContract
            } = await loadFixture(deployForTokensTransfer);

            expect(await MockERC1155.balanceOf(ControlContract.target, 2n)).to.be.eq(0n);
            //obtain
            await MockERC1155.mint(ControlContract.target, 2n, 1n);
            expect(await MockERC1155.balanceOf(ControlContract.target, 2n)).to.be.eq(1n);
            //send
            await ControlContract.transferERC1155(MockERC1155.target, bob.address, 2n, 1n);
            expect(await MockERC1155.balanceOf(bob.address, 2n)).to.be.eq(1n);
            //
            expect(await MockERC1155.balanceOf(ControlContract.target, 2n)).to.be.eq(0n);

        });
        
    });

});
