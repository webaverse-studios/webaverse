// singleton loading manager
// creates a full screen loading screen and updates the loader with progress
// the progress is received from the webaverse object (from webaverse.js)
// webaverse is an EventTarget that dispatches events, notably the loadProgress event

export class LoadingManager {
    constructor(webaverse) {
        // create some dev elements to show the loading progress
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.style.position = 'fixed';
        this.loadingScreen.style.top = 0;
        this.loadingScreen.style.left = 0;
        this.loadingScreen.style.width = '100%';
        this.loadingScreen.style.height = '100%';
        this.loadingScreen.style.background = 'rgba(0, 0, 0, 1.0)';
        this.loadingScreen.style.display = 'block';
        this.loadingScreen.style.pointerEvents = 'all';
        this.loadingScreen.style.zIndex = 1000;
        document.body.appendChild(this.loadingScreen);

        this.loadingBar = document.createElement('div');
        this.loadingBar.style.position = 'absolute';
        this.loadingBar.style.top = '50%';
        this.loadingBar.style.left = '50%';
        this.loadingBar.style.width = '0%';
        this.loadingBar.style.height = '5px';
        this.loadingBar.style.background = 'rgba(255, 255, 255, 1.0)';
        this.loadingBar.style.transform = 'translate(-50%, -50%)';
        this.loadingScreen.appendChild(this.loadingBar);

        // add a border to the loading bar
        const border = document.createElement('div');
        border.style.position = 'absolute';
        border.style.top = '50%';
        border.style.left = '50%';
        border.style.width = '50%';
        border.style.height = '5px';
        border.style.background = 'rgba(255, 255, 255, 0.5)';
        border.style.transform = 'translate(-50%, -50%)';
        this.loadingScreen.appendChild(border);

        // add the text LOADING over the loading bar
        const loadingText = document.createElement('div');
        loadingText.style.position = 'absolute';
        loadingText.style.top = 'calc(50% - 20px)';
        loadingText.style.left = '50%';
        loadingText.style.width = '100%';
        loadingText.style.textAlign = 'center';
        loadingText.style.color = 'rgba(255, 255, 255, 1.0)';
        loadingText.style.transform = 'translate(-50%, -50%)';
        loadingText.innerHTML = 'LOADING...';
        // make the text a bit bigger
        loadingText.style.fontSize = '20px';
        this.loadingScreen.appendChild(loadingText);

        // add the backgroundImage images/world.jpg fullscreen and blur it a lot
        const backgroundImage = document.createElement('img');
        backgroundImage.src = 'images/world.jpg';
        backgroundImage.style.position = 'absolute';
        backgroundImage.style.top = 0;
        backgroundImage.style.left = 0;
        backgroundImage.style.width = '100%';
        backgroundImage.style.height = '100%';
        backgroundImage.style.filter = 'blur(10px)';
        backgroundImage.style.objectFit = 'cover';

        // put behind all other elements in the loadingScreen
        backgroundImage.style.zIndex = -1;

        this.loadingScreen.appendChild(backgroundImage);



        this.webavere = webaverse;
    
        // subscribe to the loadProgress event on webaverse object (from webavberse.js)
        // and update the loading bar
        webaverse.addEventListener('loadProgress', e => {
            const progress = e.data.loadProgressPercentage;
            this.loadingBar.style.width = `${progress/2}%`;
        });

        webaverse.addEventListener('loaded', e => {
            console.log('received loaded event', e)
            this.hide();
        });
    }
    
    hide() {
        // fade out the loading screen, then remove it from the DOM
        const interval = setInterval(() => {
            const opacity = parseFloat(this.loadingScreen.style.opacity);
            if (opacity > 0) {
                this.loadingScreen.style.opacity = opacity - 0.05;
            } else {
                clearInterval(interval);
                this.loadingScreen.style.display = 'none';
            }
        }, 50);
    }
    }