export class LoadingManager {
    constructor(webaverse) {
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
        this.loadingBar.style.backgroundImage = 'url(images/ui/loadingbarprogress.svg)';
        this.loadingBar.style.backgroundPosition = 'center';
        this.loadingBar.style.backgroundSize = 'contain';
        this.loadingBar.style.position = 'absolute';
        this.loadingBar.style.bottom = 'calc(152px)';
        this.loadingBar.style.left = '50%';
        this.loadingBar.style.width = '0%';
        this.loadingBar.style.height = '5px';
        this.loadingBar.style.transform = 'translate(-50%, 0%)';
        this.loadingBar.style.zIndex = 1001;
        this.loadingScreen.appendChild(this.loadingBar);

        const border = document.createElement('div');
        border.style.backgroundImage = 'url(images/ui/loadingbar.svg)';
        border.style.backgroundPosition = 'center';
        border.style.backgroundSize = 'contain';
        border.style.backgroundRepeat = 'no-repeat';
        border.style.position = 'absolute';
        border.style.bottom = '100px';
        border.style.left = '50%';
        border.style.width = '80vw';
        border.style.height = '92px';
        border.style.transform = 'translate(-50%, 0%)';
        this.loadingScreen.appendChild(border);

        const backgroundImage = document.createElement('img');
        backgroundImage.src = 'images/world.jpg';
        backgroundImage.style.position = 'absolute';
        backgroundImage.style.top = 0;
        backgroundImage.style.left = 0;
        backgroundImage.style.width = '100%';
        backgroundImage.style.height = '100%';
        backgroundImage.style.filter = 'blur(10px)';
        backgroundImage.style.objectFit = 'cover';
        backgroundImage.style.zIndex = -1;

        this.loadingScreen.appendChild(backgroundImage);
        const keyboardImage = document.createElement('div');
        keyboardImage.style.position = 'absolute';
        keyboardImage.style.top = 'calc(50% + 20px)';
        keyboardImage.style.left = '50%';
        keyboardImage.style.width = '100%';
        keyboardImage.style.textAlign = 'center';
        keyboardImage.style.color = 'rgba(255, 255, 255, 1.0)';
        keyboardImage.style.transform = 'translate(-50%, -50%)';
        keyboardImage.style.backgroundImage = 'url(images/inputlayout.png)';
        keyboardImage.style.backgroundPosition = 'center';
        keyboardImage.style.backgroundSize = 'contain';
        keyboardImage.style.width = '60vw';
        keyboardImage.style.height = '26vw';
        keyboardImage.style.zIndex = 1;

        this.loadingScreen.appendChild(keyboardImage);

        this.webavere = webaverse;
    
        webaverse.addEventListener('loadProgress', e => {
            const progress = e.data.loadProgressPercentage;
            this.loadingBar.style.width = `calc(${progress*(.8)}vw - 10px)`;
        });

        webaverse.addEventListener('loaded', e => {
            this.hide();
        });
    }
    
    hide() {
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