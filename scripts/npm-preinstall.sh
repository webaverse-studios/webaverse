echo 'Updating Packages...'
sudo apt-get update
echo 'Installing Packages...'
sudo apt-get install \ 
libatk1.0-0 \ 
libatk-bridge2.0-0 \ 
libxcomposite-dev \
libxdamage1 \
libxrandr2 \
libgbm-dev \
libxkbcommon-x11-0 \
libpangocairo-1.0-0 \ 
libasound2 \ 
libwayland-client0 \
-y # -y flag will say YES to all prompts