/*---------------------------------------------------------------
Tooltip su mobile
---------------------------------------------------------------*/
const tooltips = document.querySelectorAll('.tooltip');
tooltips.forEach(tooltip => {
const btn = tooltip.querySelector('[data-tip]');
btn.addEventListener('click', (e) => {
        e.stopPropagation();
        tooltips.forEach(t => t.classList.remove('active'));
        tooltip.classList.toggle('active');
    });
});
document.addEventListener('click', () => tooltips.forEach(t => t.classList.remove('active')));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') tooltips.forEach(t => t.classList.remove('active'));
});

/*---------------------------------------------------------------
Gestione app
---------------------------------------------------------------*/
const { createApp, ref, watch, onMounted } = Vue;

createApp({
    setup() {
        //Tab attiva (commissioni o inflazione)
        const activeTab = ref("com");
        
        //Flag (per verificare se il campo selezionato è il capitale)
        const comCapitaleFocus = ref(false)
        const infCapitaleFocus = ref(false)

        //Form con tutti i dati (commissioni e inflazione)
        const form = ref({
           commissioni: {
               capitale: null,
               anni: null,
               commissioni: 2.5,
               rendimento: 8,
           },
           inflazione: {
               capitale: null,
               anni: null,
               inflazione: 2,
               rendimento: 8,
            }
        });

        //Oggetto con tutti i dati da stampare come risultati delle operazioni
        const results = ref({
            commissioni: {
                investimentoSenzaCommissioni: "€ 0,00",
                investimentoConCommissioni: "€ 0,00",
                costoTotaleCommissioni: "€ 0,00",
                crescitaSenzaCommissioni: "0%",
                crescitaConCommissioni: "0%",
                capitalePerso: "0%",
            },
            inflazione: {
                capitaleInvestito: "€ 0,00",
                capitaleNonInvestito: "€ 0,00",
                costoCapitale: "€ 0,00",
            }
        });

        //Funzione per formattare i prezzi con la sintassi italiana
        function formatItalianCurrency(value, currencySymbol = "€") {
            if (typeof value !== "number" || isNaN(value)) return currencySymbol + " 0,00";
            return currencySymbol + " " + new Intl.NumberFormat("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(value);
        }

        //Calcolo commissioni (TAB: Commissioni)
        function calcolaCommissioni(capitale, rendimento, commissioni, anni) {
            const senzaComm = capitale * Math.pow(1 + rendimento / 100, anni);

            let valore = capitale;
            let totaleCommissioni = 0;
            for (let y = 1; y <= anni; y++) {
                valore *= 1 + rendimento / 100;
                const fee = valore * (commissioni / 100);
                totaleCommissioni += fee;
                valore -= fee;
            }

            return {
                investimentoSenzaCommissioni: formatItalianCurrency(senzaComm),
                investimentoConCommissioni: formatItalianCurrency(valore),
                costoTotaleCommissioni: formatItalianCurrency(totaleCommissioni),
                valoreFinaleSenza: senzaComm,
                valoreFinaleCon: valore
            };
        }

        //Calcolo inflazione (TAB: Inflazione)
        function calcolaInflazione(capitale, inflazione, rendimento, anni) {
            const investito = capitale * Math.pow(1 + rendimento / 100, anni);
            const nonInvestito = capitale / Math.pow(1 + inflazione / 100, anni);

            return {
                capitaleInvestito: formatItalianCurrency(investito),
                capitaleNonInvestito: formatItalianCurrency(nonInvestito),
                costoCapitale: formatItalianCurrency(investito - nonInvestito),
            };
        }

        //Calcolo serie anno per anno (per il grafico delle commissioni)
        function calcolaSerieCommissioni(capitale, rendimento, commissioni, anni) {
            const senza = [];
            const conComm = [];
            let valoreConComm = capitale;

            for (let y = 0; y <= anni; y++) {
                senza.push(capitale * Math.pow(1 + rendimento / 100, y));

                if (y > 0) {
                    valoreConComm *= 1 + rendimento / 100;
                    const fee = valoreConComm * (commissioni / 100);
                    valoreConComm -= fee;
                }
                conComm.push(valoreConComm);
            }
            return { senza, conComm };
        }

        //Calcolo serie anno per anno (per il grafico dell'inflazione)
        function calcolaSerieInflazione(capitale, inflazione, rendimento, anni) {
            const investito = [];
            const nonInvestito = [];

            for (let y = 0; y <= anni; y++) {
                investito.push(capitale * Math.pow(1 + rendimento / 100, y));
                nonInvestito.push(capitale / Math.pow(1 + inflazione / 100, y));
            }
            return { investito, nonInvestito };
        }

        //Calcolo rendimento annuo effettivo (TAB: Commissioni)
        function calcolaRendimentoEffettivo(capitaleIniziale, valoreFinale, anni) {
            if (!capitaleIniziale || !anni) return 0;
            return (Math.pow(valoreFinale / capitaleIniziale, 1 / anni) - 1) * 100;
        }


        //Inizializzo il grafico
        onMounted(() => {
            //Salvo il logo di disciplina finanziaria
            const img = new Image();
            img.src = "././assets/images/disciplina-finanziaria-logo.png"; // percorso del tuo PNG (può essere anche base64)

            /*---------------------------------------------------------------
            Watermark (generico)
            ---------------------------------------------------------------*/
            const watermarkPlugin = {
                id: "watermark",
                beforeDraw: (chart) => {
                    if (!img.complete) return;
                    const ctx = chart.ctx;
                    const { width, height } = chart;
                    ctx.save();
                    ctx.globalAlpha = 0.08;
                    ctx.translate(width / 2, height / 2);
                    //Scala immagine senza deformarla
                    const scale = Math.min(width / img.width, height / img.height) / 2;
                    const drawWidth = img.width * scale;
                    const drawHeight = img.height * scale;
                    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                    ctx.restore();
                }
            };

            /*---------------------------------------------------------------
            Grafico commissioni
            ---------------------------------------------------------------*/
            //Grafici Commissioni
            const ctxCommissioni = document.getElementById("is-commissioni-chart");

            //Parametri dei grafici
            const ctxCommissioniData = {
                labels: [],
                datasets: [
                    {
                        label: "Senza commissioni",
                        data: [],
                        borderColor: "#1BC47D",
                        borderWidth: 2,
                        fill: false
                    },
                    {
                        label: "Con commissioni",
                        data: [],
                        borderColor: "#F51212",
                        borderWidth: 2,
                        backgroundColor: "rgba(255,0,0,0.2)",
                        fill: "-1"
                    }
                ]
            };

            //Opzioni dei grafici
            const ctxCommissioniOptions = {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,   // usa cerchi invece di quadrati
                            pointStyle: "line",  // forme: 'circle', 'rect', 'line', 'triangle'
                            boxWidth: 12,          // dimensione marker
                            color: "black",        // colore testo
                            font: {
                                size: 14,
                                weight: "bold"
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function () {
                                return "";
                            },
                            label: function (context) {
                                return (
                                    context.dataset.label +
                                    ": " +
                                    context.parsed.y.toLocaleString("it-IT", {
                                        style: "currency",
                                        currency: "EUR",
                                        maximumFractionDigits: 0
                                    })
                                );
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Anni",
                            font: {
                                weight: "bold",   // rende "Valore (€)" in grassetto
                                size: 14
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Valore (€)",
                            font: {
                                weight: "bold",   // rende "Valore (€)" in grassetto
                                size: 14
                            }
                        },
                        ticks: {
                            callback: (value) =>
                                value.toLocaleString("it-IT", {
                                    maximumFractionDigits: 0
                                })
                        }
                    }
                }
            };

            //Inizializzo il chart
            chartCommissioni = new Chart(ctxCommissioni, {
                type: "line",
                data: ctxCommissioniData,
                options: ctxCommissioniOptions,
                plugins: [watermarkPlugin]
            });

            /*---------------------------------------------------------------
            Grafico inflazioni
            ---------------------------------------------------------------*/
            const ctxInflazioni = document.getElementById("is-inflazioni-chart");

            //Parametri dei grafici
            const ctxInflazioniData = {
                labels: [],
                datasets: [
                    {
                        label: "Capitale investisto",
                        data: [],
                        borderColor: "#1BC47D",
                        borderWidth: 2,
                        fill: false
                    },
                    {
                        label: "Capitale fermo",
                        data: [],
                        borderColor: "#F51212",
                        borderWidth: 2,
                        backgroundColor: "rgba(255,0,0,0.2)",
                        fill: "-1"
                    }
                ]
            };

            //Opzioni dei grafici
            const ctxInflazioniOptions = {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,   // usa cerchi invece di quadrati
                            pointStyle: "line",  // forme: 'circle', 'rect', 'line', 'triangle'
                            boxWidth: 12,          // dimensione marker
                            color: "black",        // colore testo
                            font: {
                                size: 14,
                                weight: "bold"
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function () {
                                return "";
                            },
                            label: function (context) {
                                return (
                                    context.dataset.label +
                                    ": " +
                                    context.parsed.y.toLocaleString("it-IT", {
                                        style: "currency",
                                        currency: "EUR",
                                        maximumFractionDigits: 0
                                    })
                                );
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Anni",
                            font: {
                                weight: "bold",   // rende "Valore (€)" in grassetto
                                size: 14
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Valore (€)",
                            font: {
                                weight: "bold",   // rende "Valore (€)" in grassetto
                                size: 14
                            }
                        },
                        ticks: {
                            callback: (value) =>
                                value.toLocaleString("it-IT", {
                                    maximumFractionDigits: 0
                                })
                        }
                    }
                }
            };

            //Inizializzo il chart
            chartInflazioni = new Chart(ctxInflazioni, {
                type: "line",
                data: ctxInflazioniData,
                options: ctxInflazioniOptions,
                plugins: [watermarkPlugin]
            });
        });

        // Watch per aggiornare grafico + risultati
        watch(
            form,
            (nuovo) => {

                /*---------------------------------------------------------------
                Commissioni
                ---------------------------------------------------------------*/
                //Controlli sul form delle commissioni (max)
                if (nuovo.commissioni.capitale > 1000000) nuovo.commissioni.capitale = 1000000;
                if (nuovo.commissioni.anni > 50) nuovo.commissioni.anni = 50;
                if (nuovo.commissioni.commissioni > 15) nuovo.commissioni.commissioni = 15;
                if (nuovo.commissioni.rendimento > 15) nuovo.commissioni.rendimento = 15;
                //Controlli sul form delle commissioni (min)
                if (nuovo.commissioni.capitale < 0) nuovo.commissioni.capitale = 0;
                if (nuovo.commissioni.anni < 0) nuovo.commissioni.anni = 0;
                if (nuovo.commissioni.commissioni < 0) nuovo.commissioni.commissioni = 0;
                if (nuovo.commissioni.rendimento < 0) nuovo.commissioni.rendimento = 0;

                //Commissioni: Se sono stati inseriti capitale e anni...
                if (nuovo.commissioni.capitale && nuovo.commissioni.anni) {

                    //Funzione per calcolare le commissioni
                    const res = calcolaCommissioni(
                        nuovo.commissioni.capitale,
                        nuovo.commissioni.rendimento,
                        nuovo.commissioni.commissioni,
                        nuovo.commissioni.anni
                    );
                    results.value.commissioni = res;
                    
                    //Ottengo i valori senza e con commissioni
                    const { senza, conComm } = calcolaSerieCommissioni(
                        nuovo.commissioni.capitale,
                        nuovo.commissioni.rendimento,
                        nuovo.commissioni.commissioni,
                        nuovo.commissioni.anni
                    );

                    //Ottengo i valori senza e con rendimento
                    const rendimentoSenza = nuovo.commissioni.rendimento;
                    const rendimentoCon = calcolaRendimentoEffettivo(
                        nuovo.commissioni.capitale,
                        res.valoreFinaleCon,
                        nuovo.commissioni.anni
                    );

                    //Calcolo del capitale perso
                    const capitalePerso = ((res.valoreFinaleSenza - res.valoreFinaleCon) / res.valoreFinaleSenza) * 100;

                    //Formattazione dei dati
                    results.value.commissioni.crescitaSenzaCommissioni = rendimentoSenza.toFixed(1)+"%";
                    results.value.commissioni.crescitaConCommissioni = rendimentoCon.toFixed(1)+"%";
                    results.value.commissioni.capitalePerso = capitalePerso.toFixed(1)+"%";

                    //Grafico commissioni
                    if (chartCommissioni) {
                        chartCommissioni.data.labels = Array.from({ length: nuovo.commissioni.anni + 1 }, (_, i) => i);
                        chartCommissioni.data.datasets[0].data = senza;
                        chartCommissioni.data.datasets[1].data = conComm;
                        //Etichette dinamiche con % rendimento
                        chartCommissioni.data.datasets[0].label = `Senza commissioni (${rendimentoSenza.toFixed(1)}%)`;
                        chartCommissioni.data.datasets[1].label = `Con commissioni (${rendimentoCon.toFixed(1)}%)`;
                        chartCommissioni.update();
                    }

                }

                /*---------------------------------------------------------------
                Inflazione
                ---------------------------------------------------------------*/
                //Controlli sul form dell'inflazione (max)
                if (nuovo.inflazione.capitale > 1000000) nuovo.inflazione.capitale = 1000000;
                if (nuovo.inflazione.anni > 50) nuovo.inflazione.anni = 50;
                if (nuovo.inflazione.inflazione > 15) nuovo.inflazione.inflazione = 15;
                if (nuovo.inflazione.rendimento > 15) nuovo.inflazione.rendimento = 15;
                //Controlli sul form dell'inflazione (min)
                if (nuovo.inflazione.capitale < 0) nuovo.inflazione.capitale = 0;
                if (nuovo.inflazione.anni < 0) nuovo.inflazione.anni = 0;
                if (nuovo.inflazione.inflazione < 0) nuovo.inflazione.inflazione = 0;
                if (nuovo.inflazione.rendimento < 0) nuovo.inflazione.rendimento = 0;

                //Inflazione: Se sono stati inseriti capitale e anni...
                if (nuovo.inflazione.capitale && nuovo.inflazione.anni) {

                    //Funzione per calcolare l'inflazione
                    results.value.inflazione = calcolaInflazione(
                        nuovo.inflazione.capitale,
                        nuovo.inflazione.inflazione,
                        nuovo.inflazione.rendimento,
                        nuovo.inflazione.anni
                    );

                    //Ottengo i valori senza e con commissioni
                    const { investito, nonInvestito } = calcolaSerieInflazione(
                        nuovo.inflazione.capitale,
                        nuovo.inflazione.inflazione,
                        nuovo.inflazione.rendimento,
                        nuovo.inflazione.anni
                    );

                    //Grafico inflazione
                    if (chartInflazioni) {
                        chartInflazioni.data.labels = Array.from({ length: nuovo.inflazione.anni + 1 }, (_, i) => i);
                        chartInflazioni.data.datasets[0].data = investito;
                        chartInflazioni.data.datasets[1].data = nonInvestito;
                        //Etichette dinamiche con % rendimento
                        chartInflazioni.data.datasets[0].label = `Investito (${nuovo.inflazione.rendimento.toFixed(1)}%)`;
                        chartInflazioni.data.datasets[1].label = `Non investito (inflazione ${nuovo.inflazione.inflazione.toFixed(1)}%)`;
                        chartInflazioni.update();
                    }
                }
            },
            { deep: true }
        );
        
        //Gestisco la tab attiva
        watch(
            activeTab,
            (tabAttiva) => {
                if(tabAttiva == 'com') {
                    //Possibili operazioni
                }
                if(tabAttiva == 'inf') {
                    //Possibili operazioni
                }
            }
        );

        //Restituisco i valori
        return {
            activeTab,
            form,
            results,
            comCapitaleFocus,
            infCapitaleFocus
        };
    }
}).mount('#is-app');