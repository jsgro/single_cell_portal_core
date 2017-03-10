class SingleCellMailer < ApplicationMailer
  default from: 'no-reply@broadinstitute.org'

  def notify_admin_upload_fail(study_file, error)
    @users = User.where(admin: true).map(&:email)
    @study = study_file.study
    @study_file = study_file
    @error = error
    mail(to: @users, subject: '[Single Cell Portal ERROR] FireCloud auto-upload fail in ' + @study.name) do |format|
      format.html
    end
  end

  def notify_user_parse_complete(email, title, message)
    @message = message
    mail(to: email, subject: '[Single Cell Portal Notifier] ' + title)
  end

  def notify_user_parse_fail(email, title, error)
    @error = error
    mail(to: email, subject: '[Single Cell Portal Notifier] ' + title)
  end

  def daily_disk_status
    @users = User.where(admin: true).map(&:email)
    header, portal_disk = `df -h /home/app/webapp`.split("\n")
    @table_header = header.split
    @portal_row = portal_disk.split
    @table_header.slice!(-1)
    @data_disk_row = `df -h /home/app/webapp/data`.split("\n").last.split
    mail(to: @users, subject: "Single Cell Portal Disk Usage for #{Date.today.to_s}") do |format|
      format.html
    end
  end

  def delayed_job_email(message)
    @users = User.where(admin: true).map(&:email)

    mail(to: @users, subject: 'Single Cell Portal DelayedJob workers automatically restarted') do |format|
      format.text {render text: message}
    end
  end

  def share_notification(user, share)
    @share = share
    @study = @share.study
    @user = user

    mail(to: @share.email, cc: user.email, subject: "[Single Cell Portal Notifier] Study: #{@study.name} has been shared") do |format|
      format.html
    end
	end

	def share_update_notification(study, changes, update_user)
		@study = study
		@changes = changes
		@notify = @study.study_shares.map(&:email)
		@notify << @study.user.email

		# remove user performing action from notification
		@notify.delete(update_user.email)
		mail(to: @notify, subject: "[Single Cell Portal Notifier] Study: #{@study.name} has been updated") do |format|
			format.html
		end
	end

	def study_delete_notification(study, user)
		@study = study
		@user = user.email

		@notify = @study.study_shares.map(&:email)
		@notify << @study.user.email
		@notify.delete_if(&:blank?)

		mail(to: @notify, subject: "[Single Cell Portal Notifier] Study: #{@study.name} has been deleted") do |format|
			format.html {render html: "<p>The study #{@study.name} has been deleted by #{@user}</p>".html_safe}
		end
	end
end
