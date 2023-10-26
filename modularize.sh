echo "Extrating Components for Job Composer"
echo "." 
sleep 1.5 
echo "." 
sleep 1.5 
echo "."

mkdir jobwizzard 
mkdir jobwizzard/controllers jobwizzard/views jobwizzard/machine_driver_scripts

cp -r templates/ jobwizzard/
cp -r public/custom/js/ jobwizzard/
cp -r schemas/ jobwizzard/
cp -r templates-all jobwizzard/
cp -r maps/ jobwizzard/

cp controllers/job_composer.rb jobwizzard/controllers/job_composer.rb
cp views/_job_config_form.erb jobwizzard/views/_job_config_form.erb
cp machine_driver_scripts/engine jobwizzard/machine_driver_scripts/engine

echo "mkdir -p ../templates ../schemas ../templates-all ../maps
cp -r templates/. ../templates
cp -r schemas/. ../schemas
cp -r maps/. ../maps
cp -r templates-all/. ../templates-all
cp -r machine_driver_scripts/. ../machine_driver_scripts/
cp -r  controllers/. ../controllers/
cp -r js/. ../public/custom/js/
cp -r views/. ../views/
" >> jobwizzard/update.sh
chmod u+x jobwizzard/update.sh


