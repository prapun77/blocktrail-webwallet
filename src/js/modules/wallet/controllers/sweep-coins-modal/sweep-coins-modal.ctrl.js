(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SweepCoinsModalController", SweepCoinsModalController);

    function SweepCoinsModalController($scope, $modalInstance, sweeperService, sdkService, Wallet, CONFIG, dialogService,
                                        $translate, $log) {
        $scope.bip39EN = blocktrailSDK.bip39wordlist;

        $scope.working = true;
        $scope.discovering = false;
        $scope.stepCount = 0;

        $scope.form = {
            mnemonic: null
        };

        $scope.sweepData = {
            rawTx: null,
            feePaid: null,
            inputCount: null,
            totalValue: null
        };

        var options = {
            batchSize: 50,
            accountBatchSize: 1,
            network: CONFIG.NETWORK,
            testnet: CONFIG.TESTNET
        };

        Wallet.getNewAddress().then(function (address) {
            options.recipient = address;
            $scope.working = false;
        });

        $scope.$watch('form.mnemonic', function (newVal, oldVal) {
            function strcmp (a, b) {
                return (a < b ? -1 : ( a > b ? 1 : 0 ));
            }
            // Remove line breaks
            if ($scope.form.mnemonic && $scope.form.mnemonic.length > 0) {
                $scope.form.mnemonic = $scope.form.mnemonic.replace(/[\r\n]+/g, " "); // https://stackoverflow.com/a/34936253
            }

            if (newVal && oldVal) {
                var oldWords = oldVal.split(' ');
                // If we add a word
                if (newVal.split(' ').length == 1 && oldWords.length > 1) {
                    delete oldWords[oldWords.length - 1];
                    // Special case when removing last word
                    if (strcmp(oldVal, newVal + ' ' + newVal[0])) {
                        $scope.form.mnemonic = oldWords.join(' ') + newVal + ' ';
                    } else {
                        $scope.form.mnemonic = oldWords.join(' ').slice(0, -1);
                    }
                }
            }
        });

        $scope.startSweeping = function() {
            $scope.working = true;
            $scope.discovering = true;
            sweeperService.genericSweep($scope.form.mnemonic.trim().replace(/  +/g, ' '), options).then(function (result) {
                $scope.working = false;
                $scope.discovering = false;

                if (result) {
                    $scope.sweepData = result;
                    $scope.stepCount += 1;
                } else {
                    return dialogService.alert(
                        $translate.instant("IMPORT_ERROR"),
                        $translate.instant("NO_BALANCES_FOUND")
                    ).result;
                }
            }).catch(function (error) {
                $scope.working = false;
                $scope.discovering = false;
                $log.error(error);
                return dialogService.alert(
                    $translate.instant("IMPORT_ERROR"),
                    $translate.instant("INVALID_MNEMONIC")
                ).result;
            });
        };

        $scope.publishRawTransaction = function () {
            sdkService.sdk().then(function (sdk) {
                sdk.sendRawTransaction($scope.sweepData.rawTx, function (err, result) {
                    $scope.working = false;

                    if(result.hash) {
                        $scope.dismiss();
                    } else {
                        return dialogService.alert(
                            $translate.instant("IMPORT_ERROR"),
                            $translate.instant("TX_CANT_BE_PUSHED")
                        ).result;
                    }
                });
            });
        };

        $scope.dismiss = function() {
            $modalInstance.close();
        };
    }
})();