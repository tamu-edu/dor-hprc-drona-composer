echo "Extrating Components for Job Composer"
echo "." 
sleep 1.5 
echo "." 
sleep 1.5 
echo "."

mkdir jobwizzard 
mkdir jobwizzard/controllers jobwizzard/views jobwizzard/machine_driver_scripts

# cp -r templates/ jobwizzard/
cp -r public/custom/js/ jobwizzard/
# cp -r schemas/ jobwizzard/
cp -r templates-all jobwizzard/
# cp -r maps/ jobwizzard/
cp -r environments/ jobwizzard/

cp controllers/job_composer.rb jobwizzard/controllers/job_composer.rb
cp views/_job_config_form.erb jobwizzard/views/_job_config_form.erb
cp machine_driver_scripts/engine jobwizzard/machine_driver_scripts/engine
cp machine_driver_scripts/utils.py jobwizzard/machine_driver_scripts/utils.py

echo "mkdir -p ../templates-all ../environments
cp -r environments/. ../environments
cp -r templates-all/. ../templates-all
cp -r machine_driver_scripts/. ../machine_driver_scripts/
cp -r  controllers/. ../controllers/
cp -r js/. ../public/custom/js/
cp -r views/. ../views/
" >> jobwizzard/update.sh
chmod u+x jobwizzard/update.sh


