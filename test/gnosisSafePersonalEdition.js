const utils = require('./utils')
const safeUtils = require('./utilsPersonalSafe')
const solc = require('solc')

const GnosisSafe = artifacts.require("./GnosisSafePersonalEdition.sol")
const ProxyFactory = artifacts.require("./ProxyFactory.sol")


contract('GnosisSafePersonalEdition', function(accounts) {

    let gnosisSafe
    let lw
    let executor = accounts[8]

    const CALL = 0
    const CREATE = 2

    beforeEach(async function () {
        // Create lightwallet
        lw = await utils.createLightwallet()
        // Create Master Copies
        let proxyFactory = await ProxyFactory.new()
        let gnosisSafeMasterCopy = await GnosisSafe.new()
        gnosisSafeMasterCopy.setup([lw.accounts[0], lw.accounts[1], lw.accounts[2]], 2, 0, 0)
        // Create Gnosis Safe
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([lw.accounts[0], lw.accounts[1], lw.accounts[2]], 2, 0, 0)
        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe',
        )
    })

    it('should deposit and withdraw 1 ETH', async () => {
        // Deposit 1 ETH + some spare money for execution 
        assert.equal(await web3.eth.getBalance(gnosisSafe.address), 0)
        await web3.eth.sendTransaction({from: accounts[0], to: gnosisSafe.address, value: web3.toWei(1.1, 'ether')})
        assert.equal(await web3.eth.getBalance(gnosisSafe.address).toNumber(), web3.toWei(1.1, 'ether'))

        let executorBalance = await web3.eth.getBalance(executor).toNumber()

        // Withdraw 1 ETH
        await safeUtils.executeTransaction(lw, gnosisSafe, 'executeTransaction withdraw 0.5 ETH', [lw.accounts[0], lw.accounts[2]], accounts[0], web3.toWei(0.5, 'ether'), 0, CALL, executor)

        await safeUtils.executeTransaction(lw, gnosisSafe, 'executeTransaction withdraw 0.5 ETH', [lw.accounts[0], lw.accounts[2]], accounts[0], web3.toWei(0.5, 'ether'), 0, CALL, executor)

        // Should fail as it is over the balance (payment should still happen)
        await safeUtils.executeTransaction(lw, gnosisSafe, 'executeTransaction withdraw 0.5 ETH', [lw.accounts[0], lw.accounts[2]], accounts[0], web3.toWei(0.5, 'ether'), 0, CALL, executor, true)

        let executorDiff = await web3.eth.getBalance(executor) - executorBalance
        console.log("    Executor earned " + web3.fromWei(executorDiff, 'ether') + " ETH")
        assert.ok(executorDiff > 0)
    })

    it('should add, remove and replace an owner and update the threshold', async () => {
        // Fund account for execution 
        await web3.eth.sendTransaction({from: accounts[0], to: gnosisSafe.address, value: web3.toWei(0.1, 'ether')})

        let executorBalance = await web3.eth.getBalance(executor).toNumber()
        // Add owner and set threshold to 3
        assert.equal(await gnosisSafe.threshold(), 2)
        let data = await gnosisSafe.contract.addOwner.getData(accounts[1], 3)
        await safeUtils.executeTransaction(lw, gnosisSafe, 'add owner and set threshold to 3', [lw.accounts[0], lw.accounts[1]], gnosisSafe.address, 0, data, CALL, executor)
        assert.deepEqual(await gnosisSafe.getOwners(), [accounts[1], lw.accounts[0], lw.accounts[1], lw.accounts[2]])
        assert.equal(await gnosisSafe.threshold(), 3)

        // Replace owner and keep threshold
        data = await gnosisSafe.contract.replaceOwner.getData(lw.accounts[1], lw.accounts[2], lw.accounts[3])
        await safeUtils.executeTransaction(lw, gnosisSafe, 'replace owner', [lw.accounts[0], lw.accounts[1], lw.accounts[2]], gnosisSafe.address, 0, data, CALL, executor)
        assert.deepEqual(await gnosisSafe.getOwners(), [accounts[1], lw.accounts[0], lw.accounts[1], lw.accounts[3]])

        // Remove owner and reduce threshold to 2
        data = await gnosisSafe.contract.removeOwner.getData(lw.accounts[1], lw.accounts[3], 2)
        await safeUtils.executeTransaction(lw, gnosisSafe, 'remove owner and reduce threshold to 2', [lw.accounts[0], lw.accounts[1], lw.accounts[3]], gnosisSafe.address, 0, data, CALL, executor)
        assert.deepEqual(await gnosisSafe.getOwners(), [accounts[1], lw.accounts[0], lw.accounts[1]])
        assert.equal(await gnosisSafe.threshold(), 2)

        let executorDiff = await web3.eth.getBalance(executor) - executorBalance
        console.log("    Executor earned " + web3.fromWei(executorDiff, 'ether') + " ETH")
        assert.ok(executorDiff > 0)
    })

    it('should do a CREATE transaction', async () => {
        // Fund account for execution 
        await web3.eth.sendTransaction({from: accounts[0], to: gnosisSafe.address, value: web3.toWei(0.1, 'ether')})

        let executorBalance = await web3.eth.getBalance(executor).toNumber()
        // Create test contract
        let source = `
        contract Test {
            function x() pure returns (uint) {
                return 21;
            }
        }`
        let output = await solc.compile(source, 0);
        let interface = JSON.parse(output.contracts[':Test']['interface'])
        let data = '0x' + output.contracts[':Test']['bytecode']
        const TestContract = web3.eth.contract(interface);
        let testContract = utils.getParamFromTxEvent(
            await safeUtils.executeTransaction(lw, gnosisSafe, 'create test contract', [lw.accounts[0], lw.accounts[1]], 0, 0, data, CREATE, executor),
            'ContractCreation', 'newContract', gnosisSafe.address, TestContract, 'executeTransaction CREATE'
        )
        assert.equal(await testContract.x(), 21)

        let executorDiff = await web3.eth.getBalance(executor) - executorBalance
        console.log("    Executor earned " + web3.fromWei(executorDiff, 'ether') + " ETH")
        assert.ok(executorDiff > 0)
    })
})
